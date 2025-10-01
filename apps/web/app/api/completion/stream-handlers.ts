import { runWorkflow } from '@repo/ai/workflow';
import { CHAT_MODE_CREDIT_COSTS } from '@repo/shared/config';
import { logger } from '@repo/shared/logger';
import { EVENT_TYPES, posthog } from '@repo/shared/posthog';
import { Geo } from '@vercel/functions';
import { CompletionRequestType, StreamController } from './types';
import { sanitizePayloadForJSON } from './utils';

const TTFT_METRICS = new WeakMap<StreamController, { startTs: number; primingTs?: number; firstDeltaTs?: number }>();

export function sendMessage(
    controller: StreamController,
    encoder: TextEncoder,
    payload: Record<string, any>
) {
    try {
        if (payload.content && typeof payload.content === 'string') {
            payload.content = normalizeMarkdownContent(payload.content);
        }

        const sanitizedPayload = sanitizePayloadForJSON(payload);

        const answerState = sanitizedPayload?.answer;
        const isDeltaEvent =
            payload.type === 'answer' &&
            answerState &&
            typeof answerState.text === 'string' &&
            (!answerState.finalText || answerState.status === 'PENDING');

        let message: string;
        if (isDeltaEvent) {
            const metrics = TTFT_METRICS.get(controller);
            if (metrics && metrics.firstDeltaTs == null) {
                metrics.firstDeltaTs = Date.now();
                try {
                    console.log(
                        `[TTFT] t2 first_delta_enqueued delta_ms=${metrics.firstDeltaTs - metrics.startTs} threadId=${payload.threadId} itemId=${payload.threadItemId}`
                    );
                } catch {}
            }
            message = `event: delta\ndata: ${JSON.stringify({ text: answerState.text })}\n\n`;
        } else {
            message = `event: ${payload.type}\ndata: ${JSON.stringify(sanitizedPayload)}\n\n`;
        }

        controller.enqueue(encoder.encode(message));
        controller.enqueue(new Uint8Array(0));
    } catch (error) {
        logger.error('Error serializing message payload', error, {
            payloadType: payload.type,
            threadId: payload.threadId,
        });

        const errorMessage = `event: done\ndata: ${JSON.stringify({
            type: 'done',
            status: 'error',
            error: 'Failed to serialize payload',
            threadId: payload.threadId,
            threadItemId: payload.threadItemId,
            parentThreadItemId: payload.parentThreadItemId,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorMessage));
    }
}

export function normalizeMarkdownContent(content: string): string {
    const normalizedContent = content.replace(/\\n/g, '\n');
    return normalizedContent;
}

export async function executeStream({
    controller,
    encoder,
    data,
    abortController,
    gl,
    userId,
    onFinish,
    onUsage,
    ttftStartTs,
    ttftPrimingTs,
}: {
    controller: StreamController;
    encoder: TextEncoder;
    data: CompletionRequestType;
    abortController: AbortController;
    userId?: string;
    gl?: Geo;
    onFinish?: () => Promise<void>;
    onUsage?: (usage: { promptTokens?: number | null; completionTokens?: number | null }) => void;
    ttftStartTs?: number;
    ttftPrimingTs?: number;
}): Promise<{ success: boolean } | Response> {
    try {
        const creditCost = CHAT_MODE_CREDIT_COSTS[data.mode];

        const { signal } = abortController;

        TTFT_METRICS.set(controller, { startTs: ttftStartTs ?? Date.now(), primingTs: ttftPrimingTs });

        const workflow = runWorkflow({
            mode: data.mode,
            question: data.prompt,
            threadId: data.threadId,
            threadItemId: data.threadItemId,
            messages: data.messages,
            customInstructions: data.customInstructions,
            webSearch: (data.mode === 'smart-pdf-to-excel' ? false : (data.webSearch || false)),
            config: {
                maxIterations: data.maxIterations || 3,
                signal,
            },
            gl,
            mcpConfig: data.mcpConfig || {},
            showSuggestions: data.showSuggestions || false,
            onFinish: onFinish,
            onUsage: onUsage,
        });

        workflow.onAll((event, payload) => {
            sendMessage(controller, encoder, {
                type: event,
                threadId: data.threadId,
                threadItemId: data.threadItemId,
                parentThreadItemId: data.parentThreadItemId,
                query: data.prompt,
                mode: data.mode,
                webSearch: (data.mode === 'smart-pdf-to-excel' ? false : (data.webSearch || false)),
                showSuggestions: data.showSuggestions || false,
                [event]: payload,
            });
        });

        if (process.env.NODE_ENV === 'development') {
            logger.debug('Starting workflow', { threadId: data.threadId });
        }

        await workflow.start('router', {
            question: data.prompt,
        });

        if (process.env.NODE_ENV === 'development') {
            logger.debug('Workflow completed', { threadId: data.threadId });
        }

        userId &&
            posthog.capture({
                event: EVENT_TYPES.WORKFLOW_SUMMARY,
                userId,
                properties: {
                    userId,
                    query: data.prompt,
                    mode: data.mode,
                    webSearch: (data.mode === 'smart-pdf-to-excel' ? false : (data.webSearch || false)),
                    showSuggestions: data.showSuggestions || false,
                    threadId: data.threadId,
                    threadItemId: data.threadItemId,
                    parentThreadItemId: data.parentThreadItemId,
                    summary: workflow.getTimingSummary(),
                },
            });

        console.log('[WORKFLOW SUMMARY]', workflow.getTimingSummary());

        posthog.flush();

        const metrics = TTFT_METRICS.get(controller);
        if (metrics) {
            const t1 = typeof metrics.primingTs === 'number' ? metrics.primingTs - metrics.startTs : undefined;
            const t2 = typeof metrics.firstDeltaTs === 'number' ? metrics.firstDeltaTs - metrics.startTs : undefined;
            sendMessage(controller, encoder, {
                type: 'metrics',
                threadId: data.threadId,
                threadItemId: data.threadItemId,
                parentThreadItemId: data.parentThreadItemId,
                ttft: {
                    t1_minus_t0: typeof t1 === 'number' ? t1 : null,
                    t2_minus_t0: typeof t2 === 'number' ? t2 : null,
                },
            });
        }

        sendMessage(controller, encoder, {
            type: 'done',
            status: 'complete',
            threadId: data.threadId,
            threadItemId: data.threadItemId,
            parentThreadItemId: data.parentThreadItemId,
        });

        return { success: true };
    } catch (error) {
        if (abortController.signal.aborted) {
            if (process.env.NODE_ENV === 'development') {
                logger.debug('Workflow aborted', { threadId: data.threadId });
            }

            sendMessage(controller, encoder, {
                type: 'done',
                status: 'aborted',
                threadId: data.threadId,
                threadItemId: data.threadItemId,
                parentThreadItemId: data.parentThreadItemId,
            });
        } else {
            logger.error('Workflow execution error', error, {
                userId,
                threadId: data.threadId,
                mode: data.mode,
            });

            sendMessage(controller, encoder, {
                type: 'done',
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                threadId: data.threadId,
                threadItemId: data.threadItemId,
                parentThreadItemId: data.parentThreadItemId,
            });
        }

        throw error;
    }
}