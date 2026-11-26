import { th, type TranslationDict } from './th';
import { en } from './en';

export type Locale = 'th' | 'en';

export interface LocalizedText {
  th: string;
  en: string;
}

const STORAGE_KEY = 'celestialab-locale';
const dictionaries: Record<Locale, TranslationDict> = { th, en };

type LocaleListener = (locale: Locale) => void;

class I18nManager {
  private locale: Locale = 'th';
  private listeners = new Set<LocaleListener>();

  constructor() {
    this.locale = this.readStoredLocale();
    this.applyDocumentLang();
  }

  private readStoredLocale(): Locale {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'th') {
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
    return 'th';
  }

  public getLocale(): Locale {
    return this.locale;
  }

  public t(): TranslationDict {
    return dictionaries[this.locale];
  }

  public pick(text: LocalizedText): string {
    return text[this.locale];
  }

  public format(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
      String(values[key] ?? '')
    );
  }

  public setLocale(next: Locale): void {
    if (next === this.locale) return;
    this.locale = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    this.applyDocumentLang();
    for (const listener of this.listeners) {
      listener(this.locale);
    }
  }

  public toggleLocale(): void {
    this.setLocale(this.locale === 'th' ? 'en' : 'th');
  }

  public subscribe(listener: LocaleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private applyDocumentLang(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.locale;
    }
  }
}

export const i18n = new I18nManager();
