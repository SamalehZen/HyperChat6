import { auth } from '@clerk/nextjs/server';
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

export async function POST(request: NextRequest) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: SSE_HEADERS });
    }

    try {
        const session = await auth();
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

        // Server-side attachment validations
        try {
            const history = Array.isArray(data.messages) ? data.messages : [];
            const lastUser = [...history].reverse().find((m: any) => m.role === 'user');
            const parts = Array.isArray(lastUser?.content) ? lastUser.content : [];
            const attachments = parts.filter((p: any) => p?.type === 'image' || p?.type === 'file');
            if (attachments.length > 30) {
                return new Response(JSON.stringify({ error: 'Maximum 30 fichiers par message.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }

            const toBytes = (dataUrlOrBase64: string) => {
                const base64 = typeof dataUrlOrBase64 === 'string' && dataUrlOrBase64.includes(',') ? dataUrlOrBase64.split(',')[1] : dataUrlOrBase64;
                try {
                    return Buffer.from(base64 || '', 'base64');
                } catch {
                    return Buffer.alloc(0);
                }
            };

            for (const p of attachments) {
                if (p.type === 'image') {
                    const buf = toBytes(p.image);
                    if (buf.length > 3 * 1024 * 1024) {
                        return new Response(JSON.stringify({ error: 'Image >3MB non autorisée.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                    }
                }
                if (p.type === 'file' && p.mimeType === 'application/pdf') {
                    const buf = toBytes(p.data || '');
                    if (buf.length > 20 * 1024 * 1024) {
                        return new Response(JSON.stringify({ error: 'PDF >20MB non autorisé.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                    }
                    try {
                        const pdfParse = (await import('pdf-parse')).default as any;
                        const info = await pdfParse(buf);
                        const pages = info?.numpages || info?.numPages || 0;
                        if (pages > 20) {
                            return new Response(JSON.stringify({ error: `PDF limité à 20 pages (fichier: ${p.name || 'document'}).` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                        }
                    } catch (e) {
                        console.warn('Failed to parse PDF for page count', e);
                    }
                }
            }
        } catch (e) {
            console.warn('Attachment validation skipped due to error', e);
        }

        const creditCost = CHAT_MODE_CREDIT_COSTS[data.mode];
        const ip = getIp(request);

        if (!ip) {
            return new Response(JSON.stringify({ error: 'Non autorisé' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('ip', ip);

        const remainingCredits = await getRemainingCredits({
            userId: userId ?? undefined,
            ip,
        });

        console.log('remainingCredits', remainingCredits, creditCost, process.env.NODE_ENV);

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

        console.log('gl', gl);

        const stream = createCompletionStream({
            data,
            userId,
            ip,
            abortController,
            gl,
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
}: {
    data: any;
    userId?: string;
    ip?: string;
    abortController: AbortController;
    gl: Geo;
}) {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            let heartbeatInterval: NodeJS.Timeout | null = null;

            heartbeatInterval = setInterval(() => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 15000);

            try {
                await executeStream({
                    controller,
                    encoder,
                    data,
                    abortController,
                    gl,
                    userId: userId ?? undefined,
                    onFinish: async () => {
                        // if (process.env.NODE_ENV === 'development') {
                        //     return;
                        // }
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
                    console.log('abortController.signal.aborted');
                    sendMessage(controller, encoder, {
                        type: 'done',
                        status: 'aborted',
                        threadId: data.threadId,
                        threadItemId: data.threadItemId,
                        parentThreadItemId: data.parentThreadItemId,
                    });
                } else {
                    console.log('sending error message');
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
            console.log('cancelling stream');
            abortController.abort();
        },
    });
}
