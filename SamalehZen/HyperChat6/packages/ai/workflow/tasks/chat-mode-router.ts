import { trimMessageHistoryEstimated } from '@repo/ai/models';
import { createTask } from '@repo/orchestrator';
import { ChatMode } from '@repo/shared/config';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { handleError, sendEvents } from '../utils';
export const modeRoutingTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'router',
    execute: async ({ events, context, redirectTo }) => {
        const mode = context?.get('mode') || ChatMode.GEMINI_2_5_FLASH;
        const { updateStatus } = sendEvents(events);

        const messageHistory = context?.get('messages') || [];
        const trimmedMessageHistory = trimMessageHistoryEstimated(messageHistory, mode);
        context?.set('messages', trimmedMessageHistory.trimmedMessages ?? []);

        if (!trimmedMessageHistory?.trimmedMessages) {
            throw new Error('Maximum message history reached');
        }

        updateStatus('PENDING');

        if (mode === ChatMode.Deep) {
            redirectTo('refine-query');
        } else if (mode === ChatMode.Pro) {
            redirectTo('pro-search');
        } else if (mode === ChatMode.CORRECTION) {
            redirectTo('correction');
        } else if (mode === ChatMode.CLASSIFICATION) {
            redirectTo('classification');
        } else if (mode === ChatMode.REVISION_DE_PRIX) {
            redirectTo('revision-de-prix');
        } else if (mode === ChatMode.NOMENCLATURE_DOUANIERE) {
            redirectTo('nomenclature-douaniere');
        } else if (mode === ChatMode.SMART_PDF_TO_EXCEL) {
            redirectTo('smart-pdf-to-excel');
        } else {
            redirectTo('completion');
        }
    },
    onError: handleError,
});
