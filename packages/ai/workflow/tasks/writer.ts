import { createTask } from '@repo/orchestrator';
import { format } from 'date-fns';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChunkBuffer, generateText, handleError, sendEvents } from '../utils';

export const writerTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'writer',
    execute: async ({ trace, events, context, data, signal }) => {
        const analysis = data?.analysis || '';

        const question = context?.get('question') || '';
        const summaries = context?.get('summaries') || [];
        const messages = context?.get('messages') || [];
        const { updateStep, nextStepId, updateAnswer, updateStatus } = sendEvents(events);
        const stepId = nextStepId();

        const currentDate = new Date();
        const humanizedDate = format(currentDate, 'MMMM dd, yyyy, h:mm a');

        const prompt = `

Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.

Style par défaut — HyperChat6 (Zen Aekaaa)
- Objectif: texte clair, structuré, agréable à lire.
- Ton: professionnel et pédagogique.
- Structure: H2/H3, paragraphes courts, listes de 3–5 puces; conclure par une synthèse.
- Emojis: 0–2 max si utile; jamais dans le code ni dans les titres techniques.
- Palette: neutre pour technique pur; équilibré par défaut; expressif uniquement si demandé (annonce/blog).

Aujourd’hui nous sommes ${humanizedDate}.
Vous êtes un rédacteur de recherche chargé de produire un texte détaillé et rigoureux sur « ${question} ».
Votre objectif est de créer un rapport complet basé sur les informations de recherche fournies.

Commencez par lire et analyser attentivement les informations suivantes :

<research_findings>
${summaries.map(summary => `<finding>${summary}</finding>`).join('\n')}
</research_findings>

<analysis>
${analysis}
</analysis>

## Exigences du rapport:
1. Structure et organisation:
   - Commencer par un bref résumé exécutif mettant en avant les points clés
   - Organiser le contenu par thématiques avec une progression claire entre les sujets; regrouper les informations connexes en catégories cohérentes
   - Utiliser une structure hiérarchique cohérente de bout en bout
   - Conclure par des analyses identifiant les tendances, implications et pistes futures

2. Contenu et analyse:
   - Fournir des détails précis, des données chiffrées et des informations techniques lorsque pertinent
   - Analyser la portée et l’importance des constats dans leur contexte
   - Établir des liens entre informations issues de sources différentes
   - Maintenir un ton objectif et analytique

3. Normes de mise en forme:
   - Mettre en évidence les chiffres clés, statistiques critiques et constats majeurs en gras
   - Rédiger des paragraphes continus et équilibrés (4–5 phrases chacun au maximum) avec un enchaînement logique, plutôt que des phrases très courtes
   - Utiliser des titres de section de manière stratégique uniquement pour les changements thématiques selon la question et le contenu
   - Employer des listes, tableaux, liens, images lorsque pertinent
   - Utiliser le gras pour les points clés
   - Mettre en œuvre des tableaux Markdown pour les comparaisons lorsque approprié
   - Assurer un espacement correct entre les sections pour une lecture optimale

4. Citations:
   - En vous basant sur les références dans chaque constat, vous devez citer les sources dans le rapport
   - Utiliser des citations en ligne comme [1] pour référencer la source
   - Exemple: Selon les constats récents [1][3], les avancées se sont accélérées
   - Lorsque l’information apparaît dans plusieurs constats, citer tous les numéros pertinents
   - Intégrer les citations naturellement sans perturber la lecture

Note: **La liste des références en fin de document n’est pas requise.**

Votre rapport doit démontrer une expertise du sujet tout en restant accessible à des professionnels informés. Privilégiez l’analyse substantielle plutôt que l’énumération de faits. Mettez l’accent sur les implications et la signification plutôt que sur un simple résumé.
    `;

        if (stepId) {
            updateStep({
                stepId: stepId + 1,
                stepStatus: 'COMPLETED',
                subSteps: {
                    wrapup: { status: 'COMPLETED' },
                },
            });
        }
        const chunkBuffer = new ChunkBuffer({
            threshold: 8,
            breakOn: ['\n'],
            onFlush: (text: string) => {
                updateAnswer({
                    text,
                    status: 'PENDING',
                });
            },
        });

        const answer = await generateText({
            prompt,
            model: ModelEnum.GEMINI_2_5_FLASH,
            messages,
            signal,
            onChunk: (chunk, fullText) => {
                chunkBuffer.add(chunk);
            },
        });

        // Make sure to flush any remaining content
        chunkBuffer.flush();

        updateAnswer({
            text: '',
            finalText: answer,
            status: 'COMPLETED',
        });

        context?.get('onFinish')?.({
            answer,
            threadId: context?.get('threadId'),
            threadItemId: context?.get('threadItemId'),
        });

        updateStatus('COMPLETED');

        trace?.span({
            name: 'writer',
            input: prompt,
            output: answer,
            metadata: context?.getAll(),
        });
        context?.update('answer', _ => answer);

        return answer;
    },
    onError: handleError,
    route: ({ result, context }) => {
        if (context?.get('showSuggestions') && !!context?.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});