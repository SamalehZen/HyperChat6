import { createTask } from '@repo/orchestrator';
import { z } from 'zod';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateObject, getHumanizedDate, handleError, sendEvents } from '../utils';

export const plannerTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'planner',
    execute: async ({ trace, events, context, data, signal }) => {
        const messages = context?.get('messages') || [];
        const question = context?.get('question') || '';
        const currentYear = new Date().getFullYear();
        const { updateStep, nextStepId } = sendEvents(events);

        const stepId = nextStepId();

        const prompt = `
                        Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.
                        
                        Style par défaut — HyperChat6 (Zen Aekaaa)
- Structure: réponses concises; si texte libre, utiliser H2/H3 et puces de 3–5 points.
- Emojis: 0–1 max, pertinents; jamais dans le code ni titres techniques.
- Palette: neutre pour contenu technique; équilibré par défaut.

Vous êtes un planificateur de recherche stratégique. Votre rôle est d’analyser la question de recherche et de proposer une approche initiale pour trouver des informations fiables via des recherches web.
                        
                        **Question de recherche**:
                        <question>
                        ${question}
                        </question>
                        
                        **Votre tâche**:
                        1. Identifier les 1–2 aspects initiaux les plus importants à explorer en priorité
                        2. Formuler 1–2 requêtes de recherche précises qui fourniront les informations initiales les plus pertinentes
                        3. Viser d’abord une base de connaissances solide avant d’entrer dans les détails
                        
                        **Lignes directrices de la stratégie de recherche**:
                        - Créer des requêtes ciblées en utilisant des opérateurs de recherche lorsque c’est pertinent
                        - Prioriser des informations générales et fondamentales pour les premières recherches
                        - Veiller à ce que les requêtes couvrent différents aspects prioritaires de la question
                
                        ## Règles de génération des requêtes

- NE PAS élargir le périmètre au-delà de la question initiale
- NE PAS proposer de requêtes susceptibles de produire des résultats redondants
- Chaque requête doit explorer un aspect distinct
- Limiter à 1–2 requêtes hautement ciblées maximum
- Formater les requêtes comme des termes de recherche directs, PAS comme des questions
- NE PAS commencer par « how », « what », « when », « where », « why » ou « who »
- Utiliser des expressions clés concises plutôt que des phrases complètes
- Inclure une période temporelle dans les requêtes si nécessaire
- Maximum 8 mots par requête
- Si la question de l’utilisateur est claire et concise, vous pouvez l’utiliser comme l’une des requêtes

**Date et heure actuelles: **${getHumanizedDate()}**

## Exemples de mauvaises requêtes:
- "How long does a Tesla Model 3 battery last?"
- "What are the economic impacts of climate change?"
- "When should I use async await in JavaScript?"
- "Why is remote work increasing productivity?"

**Important**:
- Utiliser la date et l’heure actuelles sauf demande explicite d’une autre période
                        
                        **Format de sortie (JSON)**:
                        - reasoning: brève explication de votre premier pas pour rechercher la question
                        - queries: 2 requêtes de recherche bien formulées (4–8 mots) ciblant les aspects les plus importants
                `;

        const object = await generateObject({
            prompt,
            model: ModelEnum.GEMINI_2_5_FLASH,
            schema: z.object({
                reasoning: z.string(),
                queries: z.array(z.string()),
            }),
            messages: messages as any,
            signal,
        });

        context?.update('queries', current => [...(current ?? []), ...(object?.queries || [])]);
        // Update flow event with initial goal

        updateStep({
            stepId,
            text: object.reasoning,
            stepStatus: 'PENDING',
            subSteps: {
                search: {
                    status: 'COMPLETED',
                    data: object.queries,
                },
            },
        });

        trace?.span({
            name: 'planner',
            input: prompt,
            output: object,
            metadata: {
                data,
            },
        });

        return {
            queries: object.queries,
            stepId,
        };
    },
    onError: handleError,
    route: ({ result }) => 'web-search',
});
