import { createTask } from '@repo/orchestrator';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import {
    executeWebSearch,
    generateText,
    getHumanizedDate,
    handleError,
    processWebPages,
    sendEvents,
} from '../utils';

export const webSearchTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'web-search',
    execute: async ({ data, trace, events, context, signal }) => {
        const queries = data?.queries;
        const stepId = data?.stepId;
        const gl = context?.get('gl');
        const { updateStep } = sendEvents(events);
        const results = await executeWebSearch(queries, signal, gl);

        const searchResultsData = results?.map((result: any) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
        }));

        updateStep({
            stepId,
            stepStatus: 'PENDING',
            subSteps: {
                read: {
                    status: 'PENDING',
                    data: searchResultsData,
                },
            },
        });

        context?.update('sources', current => {
            const existingSources = current ?? [];
            const newSources = results
                ?.filter(
                    (result: any) => !existingSources.some(source => source.link === result.link)
                )
                .map((result: any, index: number) => ({
                    title: result.title,
                    link: result.link,
                    snippet: result.snippet,
                    index: index + (existingSources?.length || 1),
                }));
            return [...existingSources, ...newSources];
        });

        const processedResults = await processWebPages(results, signal, {
            timeout: 50000,
            batchSize: 5,
            maxPages: 10,
        });

        if (!processedResults || processedResults.length === 0) {
            throw new Error('No results found');
        }

        const question = context?.get('question') || '';

        const prompt = `
Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.

Rôle: Vous êtes un Traitant d’Informations de Recherche. Votre tâche est de nettoyer et de formater les résultats de recherche web sans les résumer ni les condenser.

La date et l’heure actuelles: **${getHumanizedDate()}**.
${gl?.country ? `Vous êtes en ${gl?.country}.` : ''}

<user_question>
${question}
</user_question>

**Résultats de recherche web**
${processedResults
    .filter(result => !!result?.content && !!result?.link)
    .map(result => ({
        ...result,
        index: context?.get('sources')?.find(s => s.link === result.link)?.index,
    }))
    .map(
        (result: any) =>
            `<findings index="${result.index}">\n\n ## [${result.index}] ${result.link}\n\n ### Titre: ${result.title}\n\n ${result.content} \n\n</findings>`
    )
    .join('\n')}

<directives_de_traitement>
- Ne PAS résumer ni condenser l’information
- Préserver tous les détails pertinents, faits, données, exemples et explications issus des résultats
- Retirer uniquement le contenu dupliqué, les publicités, éléments de navigation ou autres artefacts web non pertinents
- Maintenir la profondeur et l’étendue originales de l’information
- Organiser l’information de manière propre et lisible
- Présenter les différentes perspectives lorsqu’elles existent dans les sources
</directives_de_traitement>

<format_de_sortie>
- Présenter l’information détaillée dans un format propre et lisible
- Utiliser des titres/sections uniquement lorsque cela aide à organiser une information complexe
- Inclure tous les liens sources et attribuer correctement l’information en utilisant la notation [1], [2], etc.
- Se concentrer sur la préservation d’informations complètes plutôt que sur le résumé
</format_de_sortie>

<citations>
Citations et références:
- Chaque bloc de findings possède un numéro qui peut être utilisé pour référencer la source
- Utiliser des citations en ligne comme [1] pour référencer la source
- Exemple: Selon les constats récents [1][3], les avancées se sont accélérées
- Lorsque l’information apparaît dans plusieurs findings, citer tous les numéros pertinents
- Intégrer les citations naturellement sans nuire à la lecture
- Inclure une liste de références numérotées à la fin au format:
  [1] https://www.example.com
  [2] https://www.another-source.com
</citations>

      `;

        const summary = await generateText({
            model: ModelEnum.GEMINI_2_5_PRO,
            prompt,
        });

        updateStep({
            stepId,
            stepStatus: 'COMPLETED',
            subSteps: {
                read: {
                    status: 'COMPLETED',
                },
            },
        });

        trace?.span({
            name: 'web-search',
            input: prompt,
            output: summary,
            metadata: {
                queries,
                stepId,
                results,
            },
        });

        context?.update('summaries', current => [
            ...(current ?? []),
            `${queries?.map((q: any) => q.query).join(', ')} \n\n ${summary}`,
        ]);

        return {
            stepId,
            queries,
            summary,
        };
    },
    onError: handleError,
    route: ({ context }) => {
        const allQueries = context?.get('queries') || [];
        if (allQueries?.length < 6) {
            return 'reflector';
        }

        return 'analysis';
    },
});
