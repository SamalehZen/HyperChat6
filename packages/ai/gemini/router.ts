import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest, GenerationConfig } from '@google/generative-ai';
import { logger } from '@repo/shared/logger';

export type GeminiRouterResult<T> = {
  result: T;
  usedModel: string;
  fellBack: boolean;
};

export class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExhaustedError';
  }
}

type Counters = {
  date: string; // YYYY-MM-DD
  counts: Record<string, number>;
  exhaustedPrimary: boolean;
};

const getToday = () => new Date().toISOString().slice(0, 10);

export type GeminiRouterConfig = {
  primaryModel: string;
  fallbackModel: string;
  primaryDailyLimit: number;
  fallbackDailyLimit: number;
  enableFallback: boolean;
  apiKey: string;
};

function readBoolEnv(name: string, def: boolean): boolean {
  const v = process?.env?.[name];
  if (v === undefined) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function readIntEnv(name: string, def: number): number {
  const v = process?.env?.[name];
  if (v === undefined) return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

export class GeminiModelRouter {
  private client: GoogleGenerativeAI;
  private config: GeminiRouterConfig;
  private counters: Counters;

  constructor(cfg?: Partial<GeminiRouterConfig>) {
    const apiKey = cfg?.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
    this.config = {
      primaryModel: cfg?.primaryModel || process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-pro',
      fallbackModel: cfg?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash',
      primaryDailyLimit: cfg?.primaryDailyLimit ?? readIntEnv('GEMINI_PRIMARY_DAILY_LIMIT', 50),
      fallbackDailyLimit: cfg?.fallbackDailyLimit ?? readIntEnv('GEMINI_FALLBACK_DAILY_LIMIT', 250),
      enableFallback: cfg?.enableFallback ?? readBoolEnv('GEMINI_ENABLE_FALLBACK', true),
      apiKey,
    };

    if (!this.config.apiKey) {
      logger.warn('Gemini router initialized without API key');
    }

    this.client = new GoogleGenerativeAI(this.config.apiKey);
    this.counters = {
      date: getToday(),
      counts: { [this.config.primaryModel]: 0, [this.config.fallbackModel]: 0 },
      exhaustedPrimary: false,
    };
  }

  private rotateIfNewDay() {
    const today = getToday();
    if (this.counters.date !== today) {
      this.counters = {
        date: today,
        counts: { [this.config.primaryModel]: 0, [this.config.fallbackModel]: 0 },
        exhaustedPrimary: false,
      };
      logger.info('Gemini router counters reset for new day', { date: today });
    }
  }

  private markAttempt(model: string) {
    this.rotateIfNewDay();
    this.counters.counts[model] = (this.counters.counts[model] || 0) + 1;
  }

  private isQuotaError(err: any): boolean {
    const msg = (err?.message || '').toLowerCase();
    const status = err?.status || err?.code || err?.response?.status;
    return (
      status === 429 ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('resource exhausted') ||
      msg.includes('exceeded')
    );
  }

  getActiveModelName(): string {
    this.rotateIfNewDay();

    // If fallback disabled, always return primary
    if (!this.config.enableFallback) {
      return this.config.primaryModel;
    }

    // If primary still under limit and not exhausted -> primary
    const pCount = this.counters.counts[this.config.primaryModel] || 0;
    if (!this.counters.exhaustedPrimary && pCount < this.config.primaryDailyLimit) {
      return this.config.primaryModel;
    }

    // Else try fallback if under limit
    const fCount = this.counters.counts[this.config.fallbackModel] || 0;
    if (fCount < this.config.fallbackDailyLimit) {
      return this.config.fallbackModel;
    }

    // Both exhausted
    return '';
  }

  async withModel<T>(fn: (modelName: string, client: GoogleGenerativeAI) => Promise<T>): Promise<GeminiRouterResult<T>> {
    this.rotateIfNewDay();

    const tryPrimary = this.config.enableFallback && !this.counters.exhaustedPrimary;

    const pCount = this.counters.counts[this.config.primaryModel] || 0;
    const fCount = this.counters.counts[this.config.fallbackModel] || 0;

    const canUsePrimary = (!tryPrimary ? true : true) && pCount < this.config.primaryDailyLimit;
    const canUseFallback = fCount < this.config.fallbackDailyLimit;

    if (!this.config.enableFallback) {
      if (!canUsePrimary) {
        throw new QuotaExhaustedError('Primary Gemini daily limit reached and fallback disabled');
      }
      this.markAttempt(this.config.primaryModel);
      const result = await fn(this.config.primaryModel, this.client);
      return { result, usedModel: this.config.primaryModel, fellBack: false };
    }

    // Try primary first when allowed and not exhausted
    if (canUsePrimary && !this.counters.exhaustedPrimary) {
      try {
        this.markAttempt(this.config.primaryModel);
        const result = await fn(this.config.primaryModel, this.client);
        return { result, usedModel: this.config.primaryModel, fellBack: false };
      } catch (err: any) {
        if (this.isQuotaError(err)) {
          this.counters.exhaustedPrimary = true;
          logger.warn('Primary Gemini quota exhausted; falling back', {
            date: this.counters.date,
            model: this.config.primaryModel,
            counts: { ...this.counters.counts },
          });
          // fall through to fallback retry below
        } else {
          // Non-quota error -> propagate (do not mark exhausted)
          throw err;
        }
      }
    }

    // Try fallback
    if (canUseFallback) {
      this.markAttempt(this.config.fallbackModel);
      const result = await fn(this.config.fallbackModel, this.client);
      logger.info('Gemini fallback used', {
        date: this.counters.date,
        usedModel: this.config.fallbackModel,
        counts: { ...this.counters.counts },
      });
      return { result, usedModel: this.config.fallbackModel, fellBack: true };
    }

    // Nothing available
    throw new QuotaExhaustedError('Gemini quota exhausted for both primary and fallback today');
  }
}

let _router: GeminiModelRouter | null = null;
export const getGeminiRouter = () => {
  if (!_router) {
    _router = new GeminiModelRouter();
  }
  return _router;
};
