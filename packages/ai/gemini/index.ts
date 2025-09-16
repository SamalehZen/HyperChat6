import { GoogleGenerativeAI, Part, Content } from '@google/generative-ai';
import { ZodSchema } from 'zod';
import { CoreMessage } from 'ai';
import { getGeminiRouter } from './router';

function toGeminiContent({ prompt, messages }: { prompt?: string; messages?: CoreMessage[] }) {
  const contents: Content[] = [];

  if (messages && messages.length > 0) {
    for (const m of messages) {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (typeof m.content === 'string') {
        contents.push({ role, parts: [{ text: m.content }] });
      } else if (Array.isArray(m.content)) {
        const parts: Part[] = [];
        for (const part of m.content) {
          if (part.type === 'text') {
            parts.push({ text: part.text });
          }
          // NOTE: If images or other modalities are needed, extend here
        }
        contents.push({ role, parts });
      }
    }
  } else if (prompt) {
    contents.push({ role: 'user', parts: [{ text: prompt }] });
  }

  return contents;
}

export async function geminiGenerateTextStreaming({
  prompt,
  messages,
  temperature,
  topP,
  maxOutputTokens,
  signal,
  onChunk,
}: {
  prompt?: string;
  messages?: CoreMessage[];
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string, fullText: string) => void;
}): Promise<{ text: string; usedModel: string; fellBack: boolean }> {
  const router = getGeminiRouter();
  const { result, usedModel, fellBack } = await router.withModel(async (modelName, client) => {
    const model = client.getGenerativeModel({ model: modelName });
    const contents = toGeminiContent({ prompt, messages });

    const generationConfig: any = {};
    if (typeof temperature === 'number') generationConfig.temperature = temperature;
    if (typeof topP === 'number') generationConfig.topP = topP;
    if (typeof maxOutputTokens === 'number') generationConfig.maxOutputTokens = maxOutputTokens;

    const resp = await model.generateContentStream({ contents, generationConfig });

    let fullText = '';
    for await (const item of resp.stream) {
      // Abort support
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }
      const delta = (item as any).text ?? (item as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? '';
      if (delta) {
        fullText += delta;
        onChunk?.(delta, fullText);
      }
    }

    return fullText as string;
  });

  return { text: result, usedModel, fellBack };
}

export async function geminiGenerateObject<T>({
  prompt,
  messages,
  schema,
  temperature,
  topP,
  maxOutputTokens,
  signal,
}: {
  prompt?: string;
  messages?: CoreMessage[];
  schema: ZodSchema<T>;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}): Promise<{ object: T; usedModel: string; fellBack: boolean } | null> {
  const router = getGeminiRouter();

  const { result, usedModel, fellBack } = await router.withModel(async (modelName, client) => {
    const model = client.getGenerativeModel({ model: modelName });
    const contents = toGeminiContent({ prompt, messages });

    const generationConfig: any = {
      // Bias towards JSON
      responseMimeType: 'application/json',
    };
    if (typeof temperature === 'number') generationConfig.temperature = temperature;
    if (typeof topP === 'number') generationConfig.topP = topP;
    if (typeof maxOutputTokens === 'number') generationConfig.maxOutputTokens = maxOutputTokens;

    const resp = await model.generateContent({ contents, generationConfig });
    const text = resp.response.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (e) {
      // Try to extract JSON block
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!match) throw new Error('Failed to parse JSON from model output');
      json = JSON.parse(match[0]);
    }

    const parsed = schema.parse(json);
    return parsed as T;
  });

  return { object: result as T, usedModel, fellBack };
}
