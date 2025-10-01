import { getSession } from '@/app/api/_lib/auth';
import { CHAT_MODE_CREDIT_COSTS, ChatModeConfig } from '@repo/shared/config';
import { Geo, geolocation } from '@vercel/functions';
import { NextRequest } from 'next/server';
import {
    DAILY_CREDITS_AUTH,
    DAILY_CREDITS_IP,
    deductCredits,
    getRemainingCredits,
} from './credit-service';
import { executeStream, sendMessage } from './stream-handlers';
import { completionRequestSchema, SSE_HEADERS } from './types';
import { getIp } from './utils';
import { getModelFromChatMode, models, estimateTokensForMessages } from '@repo/ai/models';

export const runtime = process.env.EDGE_RUNTIME === 'true' ? 'edge' : 'nodejs';

export async function POST(request: NextRequest) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: SSE_HEADERS });
    }

    const t0 = Date.now();

    try {
        const session = await getSession(request);
        const userId = session?.userId ?? undefined;

        const parsed = await request.json().catch(() => ({}));
        const validatedBody = completionRequestSchema.safeParse(parsed);

        if (!validatedBody.success) {
            return new Response(
                JSON.stringify({
                    error: 'Requête invalide.',
                    details: validatedBody.error.format(),
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { data } = validatedBody;
        const creditCost = CHAT_MODE_CREDIT_COSTS[data.mode];
        const ip = getIp(request);

        if (!ip) {
            return new Response(JSON.stringify({ error: 'Non autorisé' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const remainingCredits = await getRemainingCredits({
            userId: userId ?? undefined,
            ip,
        });

        if (!!ChatModeConfig[data.mode]?.isAuthRequired && !userId) {
            return new Response(JSON.stringify({ error: 'Authentification requise' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (remainingCredits < creditCost && process.env.NODE_ENV !== 'development') {
            return new Response(
                'Vous avez atteint la limite quotidienne de requêtes. Veuillez réessayer demain ou utiliser votre propre clé API.',
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const enhancedHeaders = {
            ...SSE_HEADERS,
            'X-Credits-Available': remainingCredits.toString(),
            'X-Credits-Cost': creditCost.toString(),
            'X-Credits-Daily-Allowance': userId
                ? DAILY_CREDITS_AUTH.toString()
                : DAILY_CREDITS_IP.toString(),
        };

        const encoder = new TextEncoder();
        const abortController = new AbortController();

        request.signal.addEventListener('abort', () => {
            abortController.abort();
        });

        const gl = geolocation(request);

        // Compute provider/model and correlation id early for init event
        let provider = 'openai';
        let modelId = 'gpt-4o-mini';
        try {
            const mEnum = getModelFromChatMode(data.mode);
            const mObj = models.find(m => m.id === mEnum);
            if (mObj) {
                provider = mObj.provider as string;
                modelId = mObj.id as unknown as string;
            }
        } catch {}

        const correlationId = (globalThis.crypto?.randomUUID
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`) as string;

        const t1 = Date.now();

        const stream = createCompletionStream({
            data,
            userId,
            ip,
            abortController,
            gl,
            provider,
            modelId,
            t0,
            t1,
            correlationId,
        });

        return new Response(stream, { headers: enhancedHeaders });
    } catch (error) {
        console.error('Error in POST handler:', error);
        return new Response(
            JSON.stringify({ error: 'Erreur interne du serveur', details: String(error) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

function createCompletionStream({
    data,
    userId,
    ip,
    abortController,
    gl,
    provider,
    modelId,
    t0,
    t1,
    correlationId,
}: {
    data: any;
    userId?: string;
    ip?: string;
    abortController: AbortController;
    gl: Geo;
    provider: string;
    modelId: string;
    t0: number;
    t1: number;
    correlationId: string;
}) {
    const encoder = new TextEncoder();

    let usageRef: { promptTokens?: number | null; completionTokens?: number | null } = {};
    return new ReadableStream({
        async start(controller) {
            let heartbeatInterval: NodeJS.Timeout | null = null;

            // Send initial comment to flush headers immediately
            controller.enqueue(encoder.encode(': keep-alive\n\n'));

            heartbeatInterval = setInterval(() => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 15000);

            const startTs = Date.now();
            const creditCost = CHAT_MODE_CREDIT_COSTS[
                data.mode as keyof typeof CHAT_MODE_CREDIT_COSTS
            ];

            // Send SSE init event with correlation and basic info
            const initPayload = {
                type: 'init',
                correlationId,
                server: {
                    t0,
                    t1,
                },
                mode: data.mode,
                model: modelId,
                provider,
                region: { country: gl?.country, region: gl?.region, city: gl?.city },
                threadId: data.threadId,
                threadItemId: data.threadItemId,
                parentThreadItemId: data.parentThreadItemId,
            };
            try {
                const message = `event: init\ndata: ${JSON.stringify(initPayload)}\n\n`;
                controller.enqueue(encoder.encode(message));
            } catch (e) {
                // ignore
            }
            const t4 = Date.now();

            // Persist initial TTFB server timings if possible (node only)
            (async () => {
                try {
                    const { prisma } = await import('@repo/prisma');
                    await prisma.telemetryTTFB.upsert({
                        where: { correlationId },
                        create: {
                            correlationId,
                            userId: userId ?? null,
                            mode: data.mode,
                            provider,
                            model: modelId,
                            region: gl?.region || null,
                            t0: new Date(t0),
                            t1: new Date(t1),
                            t4: new Date(t4),
                            preProcessingMs: t1 - t0,
                            serverTTFBMs: t4 - t0,
                        },
                        update: {
                            t0: new Date(t0),
                            t1: new Date(t1),
                            t4: new Date(t4),
                            preProcessingMs: t1 - t0,
                            serverTTFBMs: t4 - t0,
                        },
                    });
                } catch (e) {
                    console.warn('Telemetry persistence unavailable (likely Edge runtime):', e);
                }
            })();

            const logMessage = async (
                status: 'COMPLETED' | 'ERROR' | 'ABORTED',
                errorCode?: string
            ) => {
                const latencyMs = Date.now() - startTs;
                const costUsdCents = status === 'COMPLETED' ? creditCost * 5 : 0;
                let promptTokens: number | null = null;
                try {
                    if (usageRef?.promptTokens != null) promptTokens = usageRef.promptTokens;
                    else if (Array.isArray(data?.messages))
                        promptTokens = estimateTokensForMessages(data.messages as any);
                } catch {}
                let completionTokens: number | null = null;
                try {
                    if (usageRef?.completionTokens != null)
                        completionTokens = usageRef.completionTokens;
                } catch {}
                try {
                    const { prisma } = await import('@repo/prisma');
                    await prisma.messageLog.create({
                        data: {
                            userId: userId ?? null,
                            mode: data.mode,
                            provider,
                            model: modelId,
                            creditCost,
                            latencyMs,
                            status,
                            errorCode: errorCode || null,
                            promptTokens: promptTokens ?? null,
                            completionTokens: completionTokens ?? null,
                            costUsdCents,
                        },
                    });
                } catch (e) {
                    console.error('Failed to insert MessageLog', e);
                }
            };

            try {
                let t2: number | undefined;
                let t3: number | undefined;
                let chunksToFirstTextDelta = 0;
                let seenFirstTextDelta = false;

                await executeStream({
                    controller,
                    encoder,
                    data,
                    abortController,
                    gl,
                    userId: userId ?? undefined,
                    onFinish: async () => {
                        await deductCredits(
                            {
                                userId: userId ?? undefined,
                                ip: ip ?? undefined,
                            },
                            creditCost
                        );
                    },
                    onUsage: u => {
                        usageRef = u || usageRef;
                    },
                    onTiming: {
                        onModelCallStart: () => {
                            if (!t2) t2 = Date.now();
                        },
                        onProviderChunk: () => {
                            if (!seenFirstTextDelta) {
                                chunksToFirstTextDelta += 1;
                            }
                        },
                        onFirstProviderTextDelta: () => {
                            if (!seenFirstTextDelta) {
                                seenFirstTextDelta = true;
                                t3 = Date.now();
                            }
                        },
                    },
                    correlationId,
                });

                // Persist t2/t3 after stream completes
                (async () => {
                    try {
                        const { prisma } = await import('@repo/prisma');
                        await prisma.telemetryTTFB.update({
                            where: { correlationId },
                            data: {
                                t2: t2 ? new Date(t2) : null,
                                t3: t3 ? new Date(t3) : null,
                                modelTTFBMs: t2 && t3 ? t3 - t2 : null,
                            },
                        });
                    } catch (e) {
                        console.warn('Failed to update TelemetryTTFB (t2/t3):', e);
                    }
                })();

                await logMessage('COMPLETED');

                (async () => {
                    try {
                        const { prisma } = await import('@repo/prisma');
                        await prisma.telemetryTTFB.update({
                            where: { correlationId },
                            data: { totalMs: Date.now() - t0 },
                        });
                    } catch (e) {
                        console.warn('Failed to update TelemetryTTFB (totalMs):', e);
                    }
                })();
            } catch (error) {
                if (abortController.signal.aborted) {
                    await logMessage('ABORTED');
                    sendMessage(controller, encoder, {
                        type: 'done',
                        status: 'aborted',
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                } else {
                    const errMsg = error instanceof Error ? error.message : String(error);
                    await logMessage('ERROR', errMsg);
                    sendMessage(controller, encoder, {
                        type: 'done',
                        status: 'error',
                        error: errMsg,
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                }
            } finally {
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                }
                controller.close();
            }
        },
        cancel() {
            abortController.abort();
        },
    });
}
