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
            const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
            // Step 0: Préparation
            updateStep({ stepId: 0, stepStatus: 'PENDING', subSteps: { prepare: { status: 'PENDING' } } });
            await wait(250);
            updateStep({ stepId: 0, stepStatus: 'COMPLETED', subSteps: { prepare: { status: 'COMPLETED' } } });
            // Step 1: Extraction
            updateStep({ stepId: 1, stepStatus: 'PENDING', subSteps: { extract: { status: 'PENDING' } } });
            await wait(700);
            updateStep({ stepId: 1, stepStatus: 'COMPLETED', subSteps: { extract: { status: 'COMPLETED' } } });
            // Step 2: OCR (pendant le streaming)
            updateStep({ stepId: 2, stepStatus: 'PENDING', subSteps: { ocr: { status: 'PENDING' } } });
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
            // Terminer l'OCR et lancer la conversion
            updateStep({ stepId: 2, stepStatus: 'COMPLETED', subSteps: { ocr: { status: 'COMPLETED' } } });
            updateStep({ stepId: 3, stepStatus: 'PENDING', subSteps: { convert: { status: 'PENDING' } } });
        }

        updateAnswer({
            text: '',
            finalText: response,
            status: 'COMPLETED',
        });

        if (enableStepSimulation) {
            const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
            await wait(350);
            updateStep({ stepId: 3, stepStatus: 'COMPLETED', subSteps: { convert: { status: 'COMPLETED' } } });
        }

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
