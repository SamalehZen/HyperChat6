import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateText, handleError, sendEvents } from '../utils';
import { REVISION_DE_PRIX_PROMPT } from './revision-de-prix-prompt';

export const revisionDePrixTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'revision-de-prix',
    execute: async ({ events, context, signal }) => {
        const messages = context?.get('messages') || [];
        const { updateAnswer, updateStatus } = sendEvents(events);

        updateAnswer({ text: '', status: 'PENDING' });

        const response = await generateText({
            prompt: REVISION_DE_PRIX_PROMPT,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages,
            signal,
            onChunk: (chunk) => {
                updateAnswer({ text: chunk, status: 'PENDING' });
            },
        });

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