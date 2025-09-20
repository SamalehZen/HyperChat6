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

        // Detect attachments in the latest user message
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        const userParts = Array.isArray(lastUserMessage?.content) ? (lastUserMessage!.content as any[]) : [];
        const pdfFiles = userParts.filter(p => p?.type === 'file' && p?.mimeType === 'application/pdf');
        const imageParts = userParts.filter(p => p?.type === 'image');

        const hasAttachments = pdfFiles.length > 0 || imageParts.length > 0;
        if (hasAttachments) {
            prompt += `\n\nDirectives OCR: Analyse toutes les images et PDF fournis (scannés ou numériques). Restitue deux sections: 1) des tableaux en Markdown qui reflètent fidèlement les tableaux détectés (valeurs exactes, pas d’invention, cellules manquantes vides), 2) une section TEXTE_BRUT contenant tout le texte extrait, sans traduction (préserver la langue source).`;
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
            threshold: 200,
            breakOn: ['\n'],
            onFlush: (text: string) => {
                events?.update('answer', current => ({
                    ...current,
                    text,
                    status: 'PENDING' as const,
                }));
            },
        });

        let response = '';

        // If Google Gemini and PDFs present, use Google File API path
        const isGoogleGemini = model === ModelEnum.GEMINI_2_5_FLASH || model === ModelEnum.GEMINI_2_5_PRO;
        if (isGoogleGemini && pdfFiles.length > 0) {
            try {
                const { GoogleGenerativeAI, GoogleAIFileManager } = await import('@google/generative-ai');
                const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
                    (typeof self !== 'undefined' && (self as any).AI_API_KEYS?.google) || '';
                if (!apiKey) {
                    throw new Error('GEMINI_API_KEY not configured');
                }

                const genAI = new GoogleGenerativeAI(apiKey as string);
                const fm = new GoogleAIFileManager(apiKey as string);
                const modelId = model === ModelEnum.GEMINI_2_5_PRO ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
                const gemModel = genAI.getGenerativeModel({ model: modelId });

                const toBytes = (dataUrlOrBase64: string) => {
                    const base64 = dataUrlOrBase64.includes(',') ? dataUrlOrBase64.split(',')[1] : dataUrlOrBase64;
                    if (typeof Buffer !== 'undefined') return Buffer.from(base64, 'base64');
                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    return bytes;
                };

                const uploadedFiles: { name: string; uri: string; mimeType: string }[] = [];
                for (const f of pdfFiles) {
                    const res = await (fm as any).upload({
                        mimeType: 'application/pdf',
                        displayName: f?.name || 'document.pdf',
                        data: toBytes(f.data || ''),
                    });
                    const file = (res as any).file;
                    uploadedFiles.push({ name: file.name, uri: file.uri, mimeType: file.mimeType });
                    console.log('[Gemini FileAPI] Uploaded', file.name, file.uri);
                }

                const parts: any[] = [];
                parts.push({ text: prompt });
                // Include the user's textual query
                if (typeof lastUserMessage?.content === 'string') {
                    parts.push({ text: lastUserMessage.content });
                } else {
                    const textParts = (lastUserMessage?.content as any[])?.filter(p => p?.type === 'text') || [];
                    for (const tp of textParts) parts.push({ text: tp.text });
                }
                // Inline images
                for (const img of imageParts) {
                    const dataUrl: string = img.image;
                    const mime = dataUrl.substring(5, dataUrl.indexOf(';')) || 'image/png';
                    const b64 = dataUrl.split(',')[1] || '';
                    parts.push({ inlineData: { mimeType: mime, data: b64 } });
                }
                // PDF file references
                for (const uf of uploadedFiles) {
                    parts.push({ fileData: { fileUri: uf.uri, mimeType: uf.mimeType } });
                }

                // Streaming generation
                const result: any = await (gemModel as any).generateContentStream({ contents: [{ role: 'user', parts }] });
                for await (const item of result.stream) {
                    const chunk = item?.text || '';
                    if (chunk) {
                        chunkBuffer.add(chunk);
                        response += chunk;
                    }
                }

                // Cleanup uploaded files immediately
                for (const uf of uploadedFiles) {
                    try {
                        await (fm as any).delete(uf.name);
                        console.log('[Gemini FileAPI] Deleted', uf.name);
                    } catch (e) {
                        console.warn('Failed to delete file', uf.name, e);
                    }
                }
            } catch (e) {
                console.warn('Falling back to default generation path due to File API error:', e);
            }
        }

        if (!response) {
            response = await generateText({
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
            });
        }

        reasoningBuffer.end();
        chunkBuffer.end();

        events?.update('answer', prev => ({
            ...prev,
            text: '',
            fullText: response,
            status: 'COMPLETED',
        }));

        // Parse extraction into structured JSON for downloads
        const parseExtraction = (text: string) => {
            const tables: Array<{ name?: string; headers: string[]; rows: string[][] }> = [];
            const lines = text.split('\n');
            let i = 0;
            // Extract Markdown tables
            while (i < lines.length) {
                if (lines[i].trim().startsWith('|') && lines[i].includes('|')) {
                    const headerLine = lines[i].trim();
                    const dividerLine = lines[i + 1]?.trim() || '';
                    if (dividerLine.startsWith('|') && dividerLine.includes('-')) {
                        const headers = headerLine
                            .split('|')
                            .map(s => s.trim())
                            .filter(Boolean);
                        i += 2;
                        const rows: string[][] = [];
                        while (i < lines.length && lines[i].trim().startsWith('|')) {
                            const row = lines[i]
                                .split('|')
                                .map(s => s.trim())
                                .filter(Boolean);
                            if (row.length) rows.push(row);
                            i++;
                        }
                        tables.push({ headers, rows });
                        continue;
                    }
                }
                i++;
            }
            // Extract TEXTE_BRUT section
            const rawIndex = text.indexOf('TEXTE_BRUT');
            let plainText = '';
            if (rawIndex !== -1) {
                plainText = text.substring(rawIndex + 'TEXTE_BRUT'.length).trim();
            } else {
                plainText = text.trim();
            }
            return { tables, plainText };
        };

        const extraction = parseExtraction(response || '');
        events?.update('object', _ => extraction);

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
