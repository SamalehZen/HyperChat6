import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateText, handleError, sendEvents } from '../utils';
import { SMART_PDF_TO_EXCEL_PROMPT } from './smart-pdf-to-excel-prompt';
import { ChatMode } from '@repo/shared/config';

export const smartPdfToExcelTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'smart-pdf-to-excel',
    execute: async ({ events, context, signal }) => {
        const messages = context?.get('messages') || [];
        const mode = context?.get('mode');
        const { updateAnswer, updateStatus, updateStep } = sendEvents(events);

        const hasAttachments = (() => {
            try {
                const last = messages?.[messages.length - 1] as any;
                const content = last?.content;
                if (Array.isArray(content)) {
                    return content.some((c: any) => c?.type === 'image');
                }
                return false;
            } catch {
                return false;
            }
        })();

        const enableStepSimulation = mode === ChatMode.SMART_PDF_TO_EXCEL && hasAttachments;

        updateAnswer({ text: '', status: 'PENDING' });

        if (enableStepSimulation) {
            updateStep({
                stepId: 0,
                stepStatus: 'PENDING',
                subSteps: { extract: { status: 'PENDING' } },
            });
            updateStep({
                stepId: 0,
                stepStatus: 'COMPLETED',
                subSteps: { extract: { status: 'COMPLETED' } },
            });
            updateStep({
                stepId: 1,
                stepStatus: 'PENDING',
                subSteps: { ocr: { status: 'PENDING' } },
            });
        }

        const response = await generateText({
            prompt: SMART_PDF_TO_EXCEL_PROMPT,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages,
            signal,
            onChunk: (chunk) => {
                updateAnswer({ text: chunk, status: 'PENDING' });
            },
        });

        if (enableStepSimulation) {
            updateStep({
                stepId: 1,
                stepStatus: 'COMPLETED',
                subSteps: { ocr: { status: 'COMPLETED' } },
            });
        }

        updateAnswer({
            text: '',
            finalText: response,
            status: 'COMPLETED',
        });

        context?.get('onFinish')?.({
            answer: response,
            threadId: context?.get('threadId'),
            threadItemId: context?.get('threadItemId'),
        });

        updateStatus('COMPLETED');
        context?.update('answer', _ => response);

        return response;
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
