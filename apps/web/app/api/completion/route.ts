import { auth } from '@clerk/nextjs/server';
import { CHAT_MODE_CREDIT_COSTS, ChatModeConfig } from '@repo/shared/config';
import { Geo, geolocation } from '@vercel/functions';
import { NextRequest } from 'next/server';
import { performance } from 'perf_hooks';
import { getModelFromChatMode, models } from '@repo/ai/models';
import {
    DAILY_CREDITS_AUTH,
    DAILY_CREDITS_IP,
    deductCredits,
    getRemainingCredits,
} from './credit-service';
import { executeStream, sendMessage } from './stream-handlers';
import { completionRequestSchema, SSE_HEADERS } from './types';
import { getIp } from './utils';

export async function POST(request: NextRequest) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: SSE_HEADERS });
    }

    const tRequestStart = performance.now();

    try {
        const tAuthStart = performance.now();
        const session = await auth();
        const tAuthEnd = performance.now();
        const userId = session?.userId ?? undefined;

        const tBodyStart = performance.now();
        const parsed = await request.json().catch(() => ({}));
        const validatedBody = completionRequestSchema.safeParse(parsed);
        const tBodyEnd = performance.now();

        if (!validatedBody.success) {
            return new Response(
                JSON.stringify({
                    error: 'Invalid request body',
                    details: validatedBody.error.format(),
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { data } = validatedBody;
        const creditCost = CHAT_MODE_CREDIT_COSTS[data.mode];
        const ip = getIp(request);

        if (!ip) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const tKvStart = performance.now();
        const remainingCredits = await getRemainingCredits({
            userId: userId ?? undefined,
            ip,
        });
        const tKvEnd = performance.now();

        if (!!ChatModeConfig[data.mode]?.isAuthRequired && !userId) {
            return new Response(JSON.stringify({ error: 'Authentication required' }), {
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

        const modelId = getModelFromChatMode(data.mode);
        const modelMeta = models.find(m => m.id === modelId);
        const modelProvider = modelMeta?.provider || '';

        const enhancedHeaders = {
            ...SSE_HEADERS,
            'X-Credits-Available': remainingCredits.toString(),
            'X-Credits-Cost': creditCost.toString(),
            'X-Credits-Daily-Allowance': userId
                ? DAILY_CREDITS_AUTH.toString()
                : DAILY_CREDITS_IP.toString(),
            'X-Timing-Auth': (tAuthEnd - tAuthStart).toFixed(1),
            'X-Timing-BodyParse': (tBodyEnd - tBodyStart).toFixed(1),
            'X-Timing-KV': (tKvEnd - tKvStart).toFixed(1),
            'X-Model-Provider': modelProvider,
            'X-Model-Id': String(modelId),
        } as Record<string, string>;

        const encoder = new TextEncoder();
        const abortController = new AbortController();

        request.signal.addEventListener('abort', () => {
            abortController.abort();
        });

        const tGeoStart = performance.now();
        const gl = geolocation(request);
        const tGeoEnd = performance.now();

        const stream = createCompletionStream({
            data,
            userId,
            ip,
            abortController,
            gl,
            tRequestStart,
        });

        const tPreStream = performance.now() - tRequestStart;
        enhancedHeaders['X-Timing-Geo'] = (tGeoEnd - tGeoStart).toFixed(1);
        enhancedHeaders['X-Timing-PreStream'] = tPreStream.toFixed(1);

        return new Response(stream, { headers: enhancedHeaders });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: String(error) }),
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
    tRequestStart,
}: {
    data: any;
    userId?: string;
    ip?: string;
    abortController: AbortController;
    gl: Geo;
    tRequestStart: number;
}) {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            let heartbeatInterval: NodeJS.Timeout | null = null;

            heartbeatInterval = setInterval(() => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 15000);

            try {
                const tFirstEvent = performance.now();
                sendMessage(controller, encoder, {
                    type: 'init',
                    threadId: data.threadId,
                    threadItemId: data.threadItemId,
                    parentThreadItemId: data.parentThreadItemId,
                    mode: data.mode,
                    query: data.prompt,
                });

                await executeStream({
                    controller,
                    encoder,
                    data,
                    abortController,
                    gl,
                    userId: userId ?? undefined,
                    metrics: {
                        tRequestStart,
                        tFirstEvent,
                        promptLength: typeof data.prompt === 'string' ? data.prompt.length : 0,
                        messagesCount: Array.isArray(data.messages) ? data.messages.length : 0,
                    },
                    onFinish: async () => {
                        const creditCost =
                            CHAT_MODE_CREDIT_COSTS[
                                data.mode as keyof typeof CHAT_MODE_CREDIT_COSTS
                            ];
                        await deductCredits(
                            {
                                userId: userId ?? undefined,
                                ip: ip ?? undefined,
                            },
                            creditCost
                        );
                    },
                });
            } catch (error) {
                if (abortController.signal.aborted) {
                    sendMessage(controller, encoder, {
                        type: 'done',
                        status: 'aborted',
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                } else {
                    sendMessage(controller, encoder, {
                        type: 'done',
                        status: 'error',
                        error: error instanceof Error ? error.message : String(error),
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
