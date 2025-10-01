import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateText, handleError, sendEvents } from '../utils';
import { NOMENCLATURE_DOUANIERE_PROMPT } from './nomenclature-douaniere-prompt';

export const nomenclatureDouaniereTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'nomenclature-douaniere',
    execute: async ({ events, context, signal }) => {
        const messages = context?.get('messages') || [];
        const { updateAnswer, updateStatus } = sendEvents(events);

        updateAnswer({ text: '', status: 'PENDING' });

        const response = await generateText({
            prompt: NOMENCLATURE_DOUANIERE_PROMPT,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages,
            signal,
            onChunk: (chunk) => {
                updateAnswer({ text: chunk, status: 'PENDING' });
            },
            onTiming: context?.get('onTiming'),
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
