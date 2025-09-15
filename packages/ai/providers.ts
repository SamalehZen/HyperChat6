import { createAnthropic } from '@ai-sdk/anthropic';
import { createFireworks } from '@ai-sdk/fireworks';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModelV1 } from '@ai-sdk/provider';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { LanguageModelV1Middleware, wrapLanguageModel } from 'ai';
import { ModelEnum, ModelRuntimeOptions, models } from './models';

export const Providers = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    TOGETHER: 'together',
    GOOGLE: 'google',
    FIREWORKS: 'fireworks',
} as const;

export type ProviderEnumType = (typeof Providers)[keyof typeof Providers];

// Define a global type for API keys
declare global {
    interface Window {
        AI_API_KEYS?: {
            [key in ProviderEnumType]?: string;
        };
        SERPER_API_KEY?: string;
        JINA_API_KEY?: string;
        NEXT_PUBLIC_APP_URL?: string;
    }
}

// Helper function to get API key from env or global
const getApiKey = (provider: ProviderEnumType): string => {
    // For server environments
    if (typeof process !== 'undefined' && process.env) {
        switch (provider) {
            case Providers.OPENAI:
                if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
                break;
            case Providers.ANTHROPIC:
                if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
                break;
            case Providers.TOGETHER:
                if (process.env.TOGETHER_API_KEY) return process.env.TOGETHER_API_KEY;
                break;
            case Providers.GOOGLE:
                if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
                break;
            case Providers.FIREWORKS:
                if (process.env.FIREWORKS_API_KEY) return process.env.FIREWORKS_API_KEY;
                break;
        }
    }

    // For worker environments (use self)
    if (typeof self !== 'undefined') {
        // Check if AI_API_KEYS exists on self
        if ((self as any).AI_API_KEYS && (self as any).AI_API_KEYS[provider]) {
            return (self as any).AI_API_KEYS[provider];
        }

        // For browser environments (self is also defined in browser)
        if (typeof window !== 'undefined' && window.AI_API_KEYS) {
            return window.AI_API_KEYS[provider] || '';
        }
    }

    return '';
};

export const getProviderInstance = (provider: ProviderEnumType) => {
    switch (provider) {
        case Providers.OPENAI:
            return createOpenAI({
                apiKey: getApiKey(Providers.OPENAI),
            });
        case 'anthropic':
            return createAnthropic({
                apiKey: getApiKey(Providers.ANTHROPIC),
                headers: {
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
            });
        case 'together':
            return createTogetherAI({
                apiKey: getApiKey(Providers.TOGETHER),
            });
        case 'google':
            return createGoogleGenerativeAI({
                apiKey: getApiKey(Providers.GOOGLE),
            });
        case 'fireworks':
            return createFireworks({
                apiKey: getApiKey(Providers.FIREWORKS),
            });
        default:
            return createOpenAI({
                apiKey: getApiKey(Providers.OPENAI),
            });
    }
};

export const getLanguageModel = (
    m: ModelEnum,
    middleware?: LanguageModelV1Middleware,
    runtimeOptions?: ModelRuntimeOptions
) => {
    const model = models.find(model => model.id === m);
    const provider = model?.provider as ProviderEnumType;
    const instance = getProviderInstance(provider);

    const isGemini25 = m === ModelEnum.GEMINI_2_5_FLASH || m === ModelEnum.GEMINI_2_5_PRO;

    let selectedModel: any;

    if (provider === Providers.GOOGLE && isGemini25 && runtimeOptions?.reasoningEnabled) {
        const budget = Math.max(0, Math.min(10000, Math.floor(runtimeOptions.reasoningBudget || 0)));
        const opts: any = {};
        (opts as any).reasoning = { budgetTokens: budget };
        (opts as any).thinking = { budgetTokens: budget };
        try {
            selectedModel = (instance as any)(model?.id || 'gemini-2.5-flash', opts);
        } catch (e) {
            selectedModel = (instance as any)(model?.id || 'gemini-2.5-flash');
        }
    } else {
        selectedModel = (instance as any)(model?.id || 'gpt-4o-mini');
    }

    if (middleware) {
        return wrapLanguageModel({ model: selectedModel, middleware }) as LanguageModelV1;
    }
    return selectedModel as LanguageModelV1;
};
