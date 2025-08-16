import { en } from './en';
import { zh } from './zh';

export const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

export type Language = 'en' | 'zh';
export type TranslationKey = keyof typeof en;

export { en, zh };
