import { createTask } from '@repo/orchestrator';
import { z } from 'zod';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChunkBuffer, getHumanizedDate, getSERPResults, handleError, processWebPages, sendEvents } from '../utils';
import { geminiGenerateObject, geminiGenerateTextStreaming } from '../../gemini';

type SearchResult = {
    title: string;
    link: string;
    snippet?: string;
    content?: string;
    index?: number;
};

const getAnalysisPrompt = (question: string, webPageContent: SearchResult[]): string => {
    return `
Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.

Aujourd’hui nous sommes ${getHumanizedDate()}.

Vous êtes un assistant de recherche web aidant l’utilisateur à comprendre rapidement les constats liés à "${question}".

## Matériaux de recherche

<research_findings>
${webPageContent
    ?.map(
        (s, index) => `

## Constat ${index + 1}

<title>${s.title || 'Aucun titre disponible'}</title>
<content>${s.content || 'Aucun contenu disponible'}</content>
<link>${s.link || 'Aucun lien disponible'}</link>

`
    )
    .join('\n\n\n')}
</research_findings>

## Exigences de sortie:

1. Organisation du contenu:
   - Organiser l’information dans un format très scannable avec des titres et sous-titres clairs
   - Utiliser des puces pour les faits et constats clés
   - Mettre en gras les données, statistiques et conclusions importantes
   - Regrouper les informations connexes provenant de sources différentes

2. Hiérarchie de l’information:
   - Commencer par les constats les plus pertinents et importants
   - Inclure des détails, chiffres et informations techniques quand disponibles
   - Mettre en évidence les informations contradictoires ou les points de vue divergents
   - S’assurer que chaque point apporte une valeur unique sans répétition inutile

3. Contexte et pertinence:
   - Rester focalisé sur la réponse directe à la question de l’utilisateur
   - Fournir suffisamment de contexte pour que chaque point soit compréhensible indépendamment
   - Inclure des informations temporelles (dates, chronologies) lorsque pertinent
   - Résumer les concepts complexes avec un langage accessible

4. Structure visuelle:
   - Utiliser une séparation visuelle claire entre les différentes sections
   - Garder les paragraphes courts (3–4 lignes maximum)
   - Inclure une brève section « Points clés » au début pour une lecture ultra-rapide
   - Terminer par le contexte ou les limites importantes des constats

5. Citations:
   - En vous basant sur les références des constats, vous devez citer les sources dans le texte
   - Utiliser des citations en ligne comme [1] pour référencer la source
   - Exemple: Selon les constats récents [1][3], les avancées se sont accélérées
   - Lorsque l’information apparaît dans plusieurs constats, citer tous les numéros pertinents
   - Intégrer les citations naturellement sans perturber la lecture

Note: **La liste des références en fin de document n’est pas requise.**

Votre objectif est d’aider l’utilisateur à comprendre et exploiter rapidement ces résultats de recherche sans manquer les détails importants.
`;
};

export const proSearchTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'pro-search',
    execute: async ({ events, context, signal }) => {
        try {
            const question = context?.get('question');
            const { updateStatus, updateAnswer, updateStep, addSources } = sendEvents(events);
            if (!question) {
                throw new Error('No question provided for search');
            }

            const messages =
                context
                    ?.get('messages')
                    ?.filter(
                        message =>
                            (message.role === 'user' || message.role === 'assistant') &&
                            !!message.content
                    ) || [];

            // Step 1: Generate search query
            let query;
            try {
                {
                    const { object, fellBack, usedModel } = await geminiGenerateObject({
                        prompt: `Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.
                        
                        Aujourd’hui nous sommes ${getHumanizedDate()}.
                        ${context?.get('gl')?.country ? `Vous êtes en ${context?.get('gl')?.country}\n\n` : ''}
                        
                        Générez une requête pour rechercher des informations sur le Web. Assurez-vous que la requête n’est pas trop large et qu’elle est spécifique, en privilégiant des informations récentes.`,
                        messages,
                        schema: z.object({
                            query: z.string().min(1),
                        }),
                    });
                    query = object;
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
                }
            } catch (error) {
                throw new Error(
                    `Failed to generate search query: ${error instanceof Error ? error.message : String(error)}`
                );
            }

            // Step 2: Get search results
            let searchResults: SearchResult[] = [];
            try {
                const gl = context?.get('gl');
                console.log('gl', gl);
                searchResults = await getSERPResults([query.query], gl);
                if (!searchResults || searchResults.length === 0) {
                    throw new Error('No search results found');
                }
            } catch (error) {
                throw new Error(
                    `Failed to get search results: ${error instanceof Error ? error.message : String(error)}`
                );
            }

            updateStep({
                stepId: 0,
                stepStatus: 'PENDING',
                subSteps: {
                    search: { status: 'COMPLETED', data: [query.query] },
                },
            });

            const searchResultsData = searchResults.map(result => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
            }));

            updateStep({
                stepId: 0,
                stepStatus: 'PENDING',
                subSteps: {
                    read: {
                        status: 'PENDING',
                        data: searchResultsData,
                    },
                },
            });

            // Step 3: Process web pages
            let webPageContent: SearchResult[] = [];
            try {
                webPageContent = await processWebPages(
                    searchResults?.reduce((acc: SearchResult[], result: SearchResult) => {
                        if (result.title && result.link) {
                            acc.push({ title: result.title, link: result.link });
                        }
                        return acc;
                    }, []),
                    signal,
                    { batchSize: 4, maxPages: 8, timeout: 30000 }
                );

                if (!webPageContent || webPageContent.length === 0) {
                    throw new Error('Failed to process web pages');
                }
            } catch (error) {
                throw new Error(
                    `Failed to process web pages: ${error instanceof Error ? error.message : String(error)}`
                );
            }

            // Update event with read status

            updateStep({
                stepId: 0,
                stepStatus: 'COMPLETED',
                subSteps: {
                    read: { status: 'COMPLETED' },
                },
            });

            addSources(searchResultsData);

            const reasoningBuffer = new ChunkBuffer({
                threshold: 200,
                breakOn: ['\n\n'],
                onFlush: (chunk, fullText) => {
                    updateStep({
                        stepId: 1,
                        stepStatus: 'PENDING',
                        subSteps: {
                            reasoning: { status: 'COMPLETED', data: fullText },
                        },
                    });
                },
            });

            const chunkBuffer = new ChunkBuffer({
                threshold: 200,
                breakOn: ['\n\n'],
                onFlush: (chunk, fullText) => {
                    updateAnswer({
                        text: chunk,
                        status: 'PENDING',
                    });
                },
            });

            // Step 4: Generate analysis
            let reasoning = '';
            try {
                {
                    const { text, fellBack, usedModel } = await geminiGenerateTextStreaming({
                        prompt: getAnalysisPrompt(question, webPageContent),
                        messages,
                        onChunk: (chunk, fullText) => {
                            chunkBuffer.add(chunk);
                        },
                    });
                    reasoning = text;
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
                }

                if (!reasoning || reasoning.trim() === '') {
                    throw new Error('Failed to generate analysis');
                }
            } catch (error) {
                throw new Error(
                    `Failed to generate analysis: ${error instanceof Error ? error.message : String(error)}`
                );
            }

            reasoningBuffer.end();
            chunkBuffer.end();

            // Update flow with completed reasoning
            updateStep({
                stepId: 1,
                stepStatus: 'COMPLETED',
                subSteps: {
                    reasoning: { status: 'COMPLETED' },
                    wrapup: { status: 'COMPLETED' },
                },
            });

            // Update flow with completed answer
            updateAnswer({
                text: '',
                finalText: reasoning,
                status: 'COMPLETED',
            });

            updateStatus('COMPLETED');

            context?.update('answer', _ => reasoning);

            // Call onFinish callback if provided
            const onFinish = context?.get('onFinish');
            if (onFinish && typeof onFinish === 'function') {
                onFinish({
                    answer: reasoning,
                    threadId: context?.get('threadId'),
                    threadItemId: context?.get('threadItemId'),
                });
            }

            return {
                retry: false,
                result: 'success',
            };
        } catch (error) {
            console.error('Error in proSearchTask:', error);

            // Update flow with error status
            events?.update('error', prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 'ERROR',
            }));

            return {
                retry: false,
                result: 'error',
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
