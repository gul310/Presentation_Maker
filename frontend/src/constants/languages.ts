export interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  bcp47: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', bcp47: 'en-US' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl', bcp47: 'ur-PK' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (简体)', direction: 'ltr', bcp47: 'zh-CN' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', bcp47: 'ar-SA' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', bcp47: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', bcp47: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', bcp47: 'de-DE' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', bcp47: 'pt-BR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', bcp47: 'ru-RU' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', bcp47: 'ja-JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', bcp47: 'ko-KR' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', bcp47: 'hi-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr', bcp47: 'bn-BD' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', bcp47: 'tr-TR' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr', bcp47: 'id-ID' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', direction: 'ltr', bcp47: 'fil-PH' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', bcp47: 'it-IT' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', bcp47: 'nl-NL' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr', bcp47: 'vi-VN' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr', bcp47: 'th-TH' },
];

export const getLanguageByCode = (code?: string): LanguageDefinition => {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const normalized = code.toLowerCase().trim();
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.code === normalized || l.name.toLowerCase() === normalized
  );
  return match || SUPPORTED_LANGUAGES[0];
};

export const getLanguageByName = (name?: string): LanguageDefinition => {
  if (!name) return SUPPORTED_LANGUAGES[0];
  const normalized = name.toLowerCase().trim();
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.name.toLowerCase() === normalized || l.code === normalized
  );
  return match || SUPPORTED_LANGUAGES[0];
};

export const isRtlLanguage = (languageNameOrCode?: string): boolean => {
  if (!languageNameOrCode) return false;
  const lang = getLanguageByName(languageNameOrCode);
  return lang.direction === 'rtl';
};

export const getLanguageBCP47Tag = (languageNameOrCode?: string): string => {
  if (!languageNameOrCode) return 'en-US';
  const lang = getLanguageByName(languageNameOrCode);
  return lang.bcp47;
};
