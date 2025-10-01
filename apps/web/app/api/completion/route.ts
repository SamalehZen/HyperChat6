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
import { prisma } from '@repo/prisma';
import { getModelFromChatMode, models, estimateTokensForMessages } from '@repo/ai/models';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: SSE_HEADERS });
    }

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
        const t0 = Date.now();
        try {
            console.log(`[TTFT] t0 request_received ts=${t0} threadId=${data.threadId} itemId=${data.threadItemId} mode=${data.mode}`);
        } catch {}
        const creditCost = CHAT_MODE_CREDIT_COSTS[data.mode];
        const ip = getIp(request);

        // TEMP: Force disable credits system for benchmarking (no env dependency)
        const creditsEnabled = false;

        if (!ip) {
            return new Response(JSON.stringify({ error: 'Non autorisé' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('ip', ip, 'creditsEnabled', creditsEnabled);

        const remainingCredits = creditsEnabled
            ? await getRemainingCredits({ userId: userId ?? undefined, ip })
            : Number.MAX_SAFE_INTEGER;

        console.log('remainingCredits', remainingCredits, creditCost, process.env.NODE_ENV);

        if (!!ChatModeConfig[data.mode]?.isAuthRequired && !userId) {
            return new Response(JSON.stringify({ error: 'Authentification requise' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (creditsEnabled && remainingCredits < creditCost && process.env.NODE_ENV !== 'development') {
            return new Response(
                'Vous avez atteint la limite quotidienne de requêtes. Veuillez réessayer demain ou utiliser votre propre clé API.',
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const enhancedHeaders = {
            ...SSE_HEADERS,
            'X-Credits-Available': creditsEnabled ? remainingCredits.toString() : 'disabled',
            'X-Credits-Cost': creditCost.toString(),
            'X-Credits-Daily-Allowance': creditsEnabled
                ? (userId ? DAILY_CREDITS_AUTH.toString() : DAILY_CREDITS_IP.toString())
                : 'disabled',
        };

        const encoder = new TextEncoder();
        const abortController = new AbortController();

        request.signal.addEventListener('abort', () => {
            abortController.abort();
        });

        const gl = geolocation(request);

        console.log('gl', gl);

        const stream = createCompletionStream({
            data,
            userId,
            ip,
            abortController,
            gl,
            ttftStartTs: t0,
            creditsEnabled,
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
    ttftStartTs,
    creditsEnabled,
}: {
    data: any;
    userId?: string;
    ip?: string;
    abortController: AbortController;
    gl: Geo;
    ttftStartTs: number;
    creditsEnabled: boolean;
}) {
    const encoder = new TextEncoder();

    let usageRef: { promptTokens?: number | null; completionTokens?: number | null } = {};
    return new ReadableStream({
        async start(controller) {
            let heartbeatInterval: NodeJS.Timeout | null = null;

            // Send priming event immediately to unblock intermediaries
            let primingTs: number | null = null;
            try {
                controller.enqueue(encoder.encode(`event: start\ndata: {}\n\n`));
                controller.enqueue(new Uint8Array(0));
                primingTs = Date.now();
                try {
                    console.log(
                        `[TTFT] t1 priming_enqueued delta_ms=${primingTs - ttftStartTs} threadId=${data.threadId} itemId=${data.threadItemId}`
                    );
                } catch {}
            } catch (e) {
                console.warn('Failed to send priming start event', e);
            }

            // Heartbeat to keep connection alive
            heartbeatInterval = setInterval(() => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 15000);

            const startTs = Date.now();
            const creditCost = CHAT_MODE_CREDIT_COSTS[
                data.mode as keyof typeof CHAT_MODE_CREDIT_COSTS
            ];
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

            const logMessage = async (status: 'COMPLETED' | 'ERROR' | 'ABORTED', errorCode?: string) => {
                const latencyMs = Date.now() - startTs;
                const costUsdCents = status === 'COMPLETED' ? creditCost * 5 : 0;
                let promptTokens: number | null = null;
                try {
                    if (usageRef?.promptTokens != null) promptTokens = usageRef.promptTokens;
                    else if (Array.isArray(data?.messages)) promptTokens = estimateTokensForMessages(data.messages as any);
                } catch {}
                let completionTokens: number | null = null;
                try {
                    if (usageRef?.completionTokens != null) completionTokens = usageRef.completionTokens;
                } catch {}
                try {
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
                await executeStream({
                    controller,
                    encoder,
                    data,
                    abortController,
                    gl,
                    userId: userId ?? undefined,
                    onFinish: async () => {
                        if (creditsEnabled) {
                            await deductCredits(
                                {
                                    userId: userId ?? undefined,
                                    ip: ip ?? undefined,
                                },
                                creditCost
                            );
                        }
                    },
                    onUsage: (u) => { usageRef = u || usageRef; },
                    ttftStartTs,
                    ttftPrimingTs: typeof primingTs === 'number' ? primingTs : undefined,
                });
                await logMessage('COMPLETED');
            } catch (error) {
                if (abortController.signal.aborted) {
                    console.log('abortController.signal.aborted');
                    await logMessage('ABORTED');
                    sendMessage(controller, encoder, {
                        type: 'done',
                        status: 'aborted',
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                } else {
                    console.log('sending error message');
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
            console.log('cancelling stream');
            abortController.abort();
        },
    });
}