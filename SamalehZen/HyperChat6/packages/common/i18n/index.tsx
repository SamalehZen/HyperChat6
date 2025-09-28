"use client";
import { IntlProvider, useIntl } from "react-intl";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "./en.json";
import fr from "./fr.json";

export type Locale = "en" | "fr";

const STORAGE_KEY = "app.locale";

const MESSAGES: Record<Locale, Record<string, string>> = {
  en,
  fr,
};

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && (stored === "en" || stored === "fr")) return stored;
    const nav = window.navigator?.language || "fr";
    return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
  } catch {
    return "fr";
  }
}

export type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);
  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <I18nContext.Provider value={value}>
      <IntlProvider locale={locale} messages={MESSAGES[locale]} onError={() => {}}>
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  const intl = useIntl();
  return {
    locale: ctx.locale,
    setLocale: ctx.setLocale,
    formatMessage: (descriptor: { id: string; defaultMessage?: string }, values?: Record<string, any>) =>
      intl.formatMessage(descriptor as any, values),
    t: (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values),
  };
};
