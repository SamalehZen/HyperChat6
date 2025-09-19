import { createTask } from '@repo/orchestrator';
import { z } from 'zod';
import { estimateTokensByWordCount, ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateObject, getHumanizedDate, handleError } from '../utils';

const MAX_ALLOWED_TOKENS = 1000;

const SuggestionSchema = z.object({
    questions: z.array(z.string()).describe('A list of questions to user can ask followup'),
});

export const suggestionsTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'suggestions',
    execute: async ({ trace, events, context, data, signal }) => {
        const question = context?.get('question') || '';
        const answer = context?.get('answer') || '';

        const tokens = estimateTokensByWordCount(question);

        if (tokens > MAX_ALLOWED_TOKENS) {
            return {
                suggestions: [],
            };
        }
        const prompt = `Langue: Français par défaut.
Style par défaut — HyperChat6 (Zen Aekaaa)
- Objectif: proposer 2–3 questions de suivi utiles et actionnables.
- Structure: puces courtes (1 ligne), claires et spécifiques.
- Emojis: 0–1 max, uniquement si pertinent.

Rédige 2–3 questions de suivi basées sur la conversation.

                Current Question: ${question}

                CURRENT DATE: ${getHumanizedDate()}

                <answer>
                ${answer}
                </answer>

                - suggest new questions user might have based on the answer and the current question. make sure questions are concise and to the point.
                - The followup questions should always be in French, regardless of the language of the user's question.
                `;

        const object = await generateObject({
            prompt,
            model: ModelEnum.GEMINI_2_5_FLASH,
            schema: SuggestionSchema,
            signal,
        });

        events?.update('suggestions', current => object?.questions ?? []);

        return {
            suggestions: object?.questions,
        };
    },
    onError: handleError,
    route: ({ result }) => {
        return 'end';
    },
});
