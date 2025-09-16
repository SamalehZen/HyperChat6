import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChunkBuffer, getHumanizedDate, handleError, sendEvents } from '../utils';
import { geminiGenerateTextStreaming } from '../../gemini';

export const analysisTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'analysis',
    execute: async ({ trace, events, context, signal }) => {
        const messages = context?.get('messages') || [];
        const question = context?.get('question') || '';
        const prevSummaries = context?.get('summaries') || [];
        const { updateStep, nextStepId, addSources } = sendEvents(events);

        const stepId = nextStepId();

        const prompt = `
          
Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.

# Cadre d’analyse de la recherche

Aujourd’hui nous sommes ${getHumanizedDate()}.

Vous êtes un analyste de recherche chargé d’analyser en profondeur les constats liés à "${question}" avant de rédiger un rapport complet.

Vous réalisez l’analyse préalable à la rédaction des résultats de recherche.


## Matériaux de recherche

<research_findings>
${prevSummaries
    ?.map(
        (s, index) => `

## Constat ${index + 1}

${s}

`
    )
    .join('\n\n\n')}
</research_findings>


## Instructions d’analyse
- Analysez les constats un par un et mettez en évidence les informations les plus importantes qui serviront à composer un rapport complet.
- Documentez votre analyse dans un format structuré qui servira de base à la création du rapport.

                `;

        const chunkBuffer = new ChunkBuffer({
            threshold: 200,
            breakOn: ['\n\n'],
            onFlush: (chunk: string, fullText: string) => {
                updateStep({
                    stepId,
                    stepStatus: 'PENDING',
                    text: chunk,
                    subSteps: {
                        reasoning: { status: 'PENDING', data: fullText },
                    },
                });
            },
        });

        const { text, fellBack, usedModel } = await geminiGenerateTextStreaming({
            prompt,
            messages: messages as any,
            signal,
            onChunk: (chunk) => {
                // We do not have separate reasoning stream; reuse buffer for any chunk
                chunkBuffer.add(chunk);
            },
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

        chunkBuffer.flush();

        updateStep({
            stepId,
            stepStatus: 'COMPLETED',
            subSteps: {
                reasoning: { status: 'COMPLETED' },
            },
        });

        addSources(context?.get('sources') || []);

        trace?.span({
            name: 'analysis',
            input: prompt,
            output: text,
            metadata: {
                question,
                prevSummaries,
            },
        });

        return {
            queries: [],
            analysis: text,
            stepId,
        };
    },
    onError: handleError,
    route: ({ result }) => 'writer',
});
