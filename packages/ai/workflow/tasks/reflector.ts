import { createTask } from '@repo/orchestrator';
import { z } from 'zod';
import { ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { generateObject, getHumanizedDate, handleError, sendEvents } from '../utils';

export const reflectorTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'reflector',
    execute: async ({ trace, data, events, context, signal, redirectTo }) => {
        const question = context?.get('question') || '';
        const messages = context?.get('messages') || [];
        const prevQueries = context?.get('queries') || [];
        const stepId = data?.stepId;
        const prevSummaries = context?.get('summaries') || [];
        const currentYear = new Date().getFullYear();
        const { updateStep } = sendEvents(events);

        const prompt = `
Langue: Français par défaut. Si la question de l’utilisateur est clairement dans une autre langue, répondre dans cette langue.

Style par défaut — HyperChat6 (Zen Aekaaa)
- Structure: réponses concises; si texte libre, utiliser H2/H3 et puces de 3–5 points.
- Emojis: 0–1 max, pertinents; jamais dans le code ni titres techniques.
- Palette: neutre pour contenu technique; équilibré par défaut.

Vous êtes un évaluateur de progression de recherche analysant l’efficacité avec laquelle une question de recherche a été traitée. Votre responsabilité principale est d’identifier les lacunes restantes et de déterminer si des requêtes ciblées supplémentaires sont nécessaires.

## État actuel de la recherche

Question de recherche : "${question}"

Requêtes de recherche précédentes :
${prevQueries?.join('\n')}

Constats de recherche à ce stade :
${prevSummaries?.join('\n---\n')}

Date actuelle : ${getHumanizedDate()}

## Cadre d’évaluation

1. Évaluer de manière exhaustive dans quelle mesure les constats actuels répondent à la question initiale
2. Identifier les lacunes spécifiques qui empêchent de répondre complètement à la question
3. Déterminer si ces lacunes justifient des requêtes supplémentaires ou si la question a été suffisamment traitée

## Règles de génération des requêtes

- NE PAS proposer de requêtes similaires aux précédentes — examinez soigneusement chaque requête passée
- NE PAS élargir le périmètre au-delà de la question initiale
- NE PAS proposer de requêtes susceptibles de produire des résultats redondants
- Proposer UNIQUEMENT des requêtes qui comblent les lacunes identifiées
- Chaque requête doit explorer un aspect distinct non couvert par les recherches précédentes
- Limiter à 1–2 requêtes hautement ciblées maximum
- Formater les requêtes comme des termes de recherche directs, PAS comme des questions
- NE PAS commencer par « how », « what », « when », « where », « why » ou « who »
- Utiliser des expressions clés concises plutôt que des phrases complètes
- Maximum 8 mots par requête

## Exemples de mauvaises requêtes :
- "How long does a Tesla Model 3 battery last?"
- "What are the economic impacts of climate change?"
- "When should I use async await in JavaScript?"
- "Why is remote work increasing productivity?"

## Exemples de situations où retourner null pour queries :
- Lorsque tous les aspects de la question de recherche ont été traités de manière complète
- Lorsque des requêtes supplémentaires ne produiraient que des informations redondantes
- Lorsque la recherche atteint des rendements décroissants avec suffisamment d’informations collectées
- Lorsque tous les angles raisonnables de la question ont été explorés
- Lorsque les constats fournissent une réponse complète malgré quelques détails mineurs manquants

**Important** :
- Utiliser la date et l’heure actuelles pour les requêtes, sauf demande explicite d’une autre période

## Format de sortie
{
  "reasoning": "Votre analyse de l’avancement actuel de la recherche, identifiant précisément les aspects de la question qui restent sans réponse et expliquant pourquoi des requêtes supplémentaires apporteraient une information utile (ou pourquoi la recherche est complète).",
  "queries": ["terme de recherche direct 1", "terme de recherche direct 2"] // Retourner null si la recherche est suffisante ou si aucune requête non redondante ne peut être formulée
}

## Exemples de sorties

### Quand des requêtes supplémentaires sont nécessaires :

{
  "reasoning": "Les constats actuels fournissent des informations substantielles sur les performances du Tesla Model 3 et la satisfaction des propriétaires, mais manquent de données spécifiques sur les taux de dégradation de la batterie dans le temps. Cette lacune est critique car la longévité de la batterie impacte directement la valeur à long terme du véhicule et les coûts d’entretien.",
  "queries": ["tesla model 3 battery degradation rates ${currentYear}"]
}


### Quand la recherche est complète :
{
  "reasoning": "La question de recherche 'What are the benefits of intermittent fasting?' a été traitée de manière complète. Les constats couvrent les effets métaboliques, les résultats en gestion du poids, les mécanismes de réparation cellulaire et les risques potentiels selon les populations. Des angles supplémentaires seraient probablement redondants ou hors du périmètre de la question initiale.",
  "queries": null
}

**CRITIQUE : Votre objectif principal est d’éviter la redondance. Si vous ne pouvez pas identifier de nouveaux angles susceptibles d’apporter des informations différentes, retournez null pour queries.**
`;

        const object = await generateObject({
            prompt,
            model: ModelEnum.GEMINI_2_5_FLASH,
            schema: z.object({
                reasoning: z.string(),
                queries: z.array(z.string()).optional().nullable(),
            }),

            messages: messages as any,
            signal,
        });

        const newStepId = stepId + 1;

        context?.update('queries', current => [...(current ?? []), ...(object?.queries ?? [])]);

        if (!!object?.reasoning) {
            updateStep({
                stepId: newStepId,
                stepStatus: 'PENDING',
                text: object?.reasoning,
                subSteps: {
                    search: { status: 'COMPLETED', data: object?.queries },
                },
            });
        }

        if (!object?.queries?.length || !object?.reasoning) {
            redirectTo('analysis');
        }

        trace?.span({
            name: 'reflector',
            input: prompt,
            output: object,
            metadata: {
                data,
            },
        });

        return {
            queries: object?.queries,
            stepId: newStepId,
        };
    },
    onError: handleError,
    route: ({ result, executionContext, config, context }) => {
        if (result?.queries?.filter(Boolean)?.length > 0) {
            return 'web-search';
        }

        return 'analysis';
    },
});
