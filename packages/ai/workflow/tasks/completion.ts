import { createTask } from '@repo/orchestrator';
import { getModelFromChatMode, ModelEnum } from '../../models';
import { WorkflowContextSchema, WorkflowEventSchema } from '../flow';
import { ChatMode } from '@repo/shared/config';
import { ChunkBuffer, generateText, getHumanizedDate, handleError } from '../utils';

const MAX_ALLOWED_CUSTOM_INSTRUCTIONS_LENGTH = 1000000;

export const completionTask = createTask<WorkflowEventSchema, WorkflowContextSchema>({
    name: 'completion',
    execute: async ({ events, context, signal, redirectTo }) => {
        if (!context) {
            throw new Error('Context is required but was not provided');
        }

        const customInstructions = context?.get('customInstructions');
        const mode = context.get('mode');
        const webSearch = context.get('webSearch') || false;
        const model = getModelFromChatMode(mode);

        let messages =
            context
                .get('messages')
                ?.filter(
                    message =>
                        (message.role === 'user' || message.role === 'assistant') &&
                        !!message.content
                ) || [];

        console.log('customInstructions', customInstructions);

        // Le prompt spécialisé est maintenant importé depuis un fichier séparé

        if (
            customInstructions &&
            customInstructions?.length < MAX_ALLOWED_CUSTOM_INSTRUCTIONS_LENGTH
        ) {
            messages = [
                {
                    role: 'system',
                    content: `Today is ${getHumanizedDate()}. and current location is ${context.get('gl')?.city}, ${context.get('gl')?.country}. \n\n ${customInstructions}`,
                },
                ...messages,
            ];
        }

        if (webSearch) {
            redirectTo('quickSearch');
            return;
        }

        let prompt = `Rôle
        Tu es un assistant IA polyvalent s’exprimant en français. Tu fournis des réponses exactes, utiles et fiables, avec un niveau de détail adapté au besoin.

        Adaptation du ton et du style (choisis automatiquement selon la demande)
        - Questions techniques ou précises: ton factuel et structuré. Réponses claires, étapes numérotées, exemples concrets, cas limites, et mises en garde si nécessaire.
        - Discussions informelles: ton plus détendu et naturel. Reste convivial, éventuellement léger/humoristique si le contexte s’y prête.
        - Demandes créatives: ton inspirant et imaginatif. Propose des idées originales, variantes et pistes d’exploration, tout en restant pertinent par rapport à l’objectif.

        Principes de fond
        - Demande des clarifications si l’énoncé est ambigu ou incomplet.
        - Structure tes réponses (titres H2/H3, listes de 3–5 puces, blocs de code) quand cela améliore la lisibilité.
        - Cite des exemples et contre‑exemples utiles. Mentionne les hypothèses et limites.
        - Donne des explications étape par étape pour les problèmes complexes.
        - Langue: Français par défaut; si la question est clairement dans une autre langue, répondre dans cette langue.

        Style par défaut — HyperChat6 (Zen Aekaaa)
        - Objectif: réponse claire, structurée, agréable à lire.
        - Ton: adapter (professionnel, pédagogique, technique, fun) selon le besoin exprimé.
        - Structure habituelle: Titre (H1) si cadrage nécessaire, puis H2/H3, paragraphes courts, listes pour synthèse.
        - Emojis: 0–2 pertinents pour rythmer; jamais dans le code ni dans les titres H1/H2 techniques.
        - Concision: 1 idée par phrase; listes de 3–5 puces.
        - Gabarit long (si réponse substantielle): Objectif • Contexte • Étapes/Détails • Résultat attendu • Références.

        Palette de saturation (adapter automatiquement)
        - Neutre / sobre: contenu technique pur (code, API, RFC); sans emoji.
        - Équilibré / semi‑créatif: tutoriels, explications claires; quelques emojis et sous‑titres; par défaut.
        - Expressif / riche: annonces/blog/storytelling; plus d’emphase et d’emojis.

        Règle d’adaptation
        - Déterminer la palette via le contexte de la demande (mots‑clés: code/API/RFC => neutre; tutoriel/guide => équilibré; annonce/blog => expressif) et la préférence explicite de l’utilisateur si précisée.

        Contexte du jour
        Aujourd’hui: ${getHumanizedDate()}. Localisation: ${context.get('gl')?.city}, ${context.get('gl')?.country} (si disponible).
        `;

        if (mode === ChatMode.GEMINI_2_5_PRO) {
            prompt += '\n\nDirectives additionnelles: réponds de façon experte et concise.';
        }

        const reasoningBuffer = new ChunkBuffer({
            threshold: 200,
            breakOn: ['\n\n'],
            onFlush: (_chunk: string, fullText: string) => {
                events?.update('steps', prev => ({
                    ...prev,
                    0: {
                        ...prev?.[0],
                        id: 0,
                        status: 'COMPLETED',
                        steps: {
                            ...prev?.[0]?.steps,
                            reasoning: {
                                data: fullText,
                                status: 'COMPLETED',
                            },
                        },
                    },
                }));
            },
        });

        const chunkBuffer = new ChunkBuffer({
            threshold: parseInt(process.env.STREAM_FIRST_TOKEN_THRESHOLD_NEXT || '150', 10),
            thresholdInitial: parseInt(process.env.STREAM_FIRST_TOKEN_THRESHOLD_INITIAL || '1', 10),
            flushFirstTokenImmediately: (process.env.STREAM_FIRST_TOKEN_IMMEDIATE || 'true').toLowerCase() !== 'false',
            breakOn: ['\n'],
            onFlush: (text: string) => {
                events?.update('answer', current => ({
                    ...current,
                    text,
                    status: 'PENDING' as const,
                }));
            },
        });

        const response = await generateText({
            model,
            messages,
            prompt,
            signal,
            toolChoice: 'auto',
            maxSteps: 2,
            ...(mode === ChatMode.GEMINI_2_5_PRO ? { temperature: 0.1, topP: 0.1 } : {}),
            onReasoning: (chunk, fullText) => {
                reasoningBuffer.add(chunk);
            },
            onChunk: (chunk, fullText) => {
                chunkBuffer.add(chunk);
            },
            onUsage: (usage) => {
                const u = context.get('onUsage');
                if (u) u(usage);
            },
            onTiming: context.get('onTiming'),
        });

        reasoningBuffer.end();
        chunkBuffer.end();

        events?.update('answer', prev => ({
            ...prev,
            text: '',
            fullText: response,
            status: 'COMPLETED',
        }));

        context.update('answer', _ => response);

        events?.update('status', prev => 'COMPLETED');

        const onFinish = context.get('onFinish');
        if (onFinish) {
            onFinish({
                answer: response,
                threadId: context.get('threadId'),
                threadItemId: context.get('threadItemId'),
            });
        }
        return;
    },
    onError: handleError,
    route: ({ context }) => {
        if (context?.get('showSuggestions') && context.get('answer')) {
            return 'suggestions';
        }
        return 'end';
    },
});
