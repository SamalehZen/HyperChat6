import { createTask } from '@repo/orchestrator';
import { z } from 'zod';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { getHumanizedDate, handleError, sendEvents } from '../utils';
import { geminiGenerateObject } from '../../gemini';

const ClarificationResponseSchema = z.object({
    needsClarification: z.boolean(),
    reasoning: z.string().optional(),
    clarifyingQuestion: z
        .object({
            question: z.string(),
            choiceType: z.enum(['multiple', 'single']),
            options: z.array(z.string()).min(1).max(3),
        })
        .optional(),
    refinedQuery: z.string().optional(),
});

export const refineQueryTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'refine-query',
    execute: async ({ trace, events, context, data, signal }) => {
        const messages = context?.get('messages') || [];
        const question = context?.get('question') || '';
        const { updateStatus, updateAnswer, updateObject } = sendEvents(events);

        const prompt = `Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.

            Assistant: Vous êtes un assistant de recherche professionnel chargé d’affiner les requêtes des utilisateurs pour une recherche approfondie.

            DATE ACTUELLE : ${getHumanizedDate()}

            Analysez la question de l’utilisateur pour déterminer si elle nécessite une clarification avant la recherche.

            Pour les requêtes bien formulées:
            - needsClarification: false
            - refinedQuery: une version améliorée de la requête originale

            Pour les requêtes nécessitant une amélioration:
            - needsClarification: true
            - reasoning: expliquez pourquoi
            - clarifyingQuestion: proposez 1 question avec 2–3 options
            - clarifyingQuestion.choiceType: "single" ou "multiple" selon le cas

            Si l’utilisateur a déjà répondu à des questions de clarification:
            - needsClarification: false
            - refinedQuery: intégrer sa réponse

            Si l’utilisateur n’a pas répondu aux questions de clarification:
            - needsClarification: false
            - refinedQuery: utilisez la requête d’origine

            Toutes les questions et options de clarification doivent être rédigées en français par défaut (sauf si la langue de l’utilisateur est manifestement différente).
            `;

        const { object, fellBack, usedModel } = await geminiGenerateObject({
            prompt,
            schema: ClarificationResponseSchema,
            messages: messages as any,
            signal,
        });
        if (fellBack) {
            sendEvents(events).updateObject({
                geminiFallback: {
                    fellBack: true,
                    usedModel,
                    message:
                        'Switched to Gemini 2.5 Flash because the daily quota for Gemini 2.5 Pro was reached.',
                },
            });
        }

        if (object?.needsClarification) {
            updateAnswer({
                text: object.reasoning,
                finalText: object.reasoning,
                status: 'COMPLETED',
            });
            object?.clarifyingQuestion &&
                updateObject({
                    clarifyingQuestion: object?.clarifyingQuestion,
                });

            updateStatus('COMPLETED');
        } else {
            context?.update('question', current => object?.refinedQuery || question);
        }

        trace?.span({
            name: 'refine-query',
            input: prompt,
            output: object,
            metadata: {
                data,
            },
        });

        return {
            needsClarification: object?.needsClarification,
            refinedQuery: object?.refinedQuery || question,
        };
    },
    onError: handleError,
    route: ({ result }) => {
        if (result?.needsClarification) {
            return 'end';
        }

        return 'planner';
    },
});
