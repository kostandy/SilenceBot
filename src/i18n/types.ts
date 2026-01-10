/**
 * Supported language codes
 */
export type LanguageCode = 'en' | 'uk';

/**
 * Translation keys and their values
 */
export interface Translations {
    'muteme.success': string;
    'muteme.error.is_admin': string;
    'muteme.error.unauthorized': string;
    'muteme.invalid_duration': string;
    'muteme.duration_capped': string;
    'muteme.prompt': string;
    'muteme.prompt.option.minute.one': string;
    'muteme.prompt.option.minute.few'?: string;
    'muteme.prompt.option.minute.many'?: string;
    'muteme.prompt.option.minute.other': string;
    'muteme.prompt.option.hour.one': string;
    'muteme.prompt.option.hour.few'?: string;
    'muteme.prompt.option.hour.many'?: string;
    'muteme.prompt.option.hour.other': string;
    'muteme.prompt.option.day.one': string;
    'language.set.prompt': string;
    "language.set.prompt.option.en": string;
    "language.set.prompt.option.uk": string;
    'language.set.success': string;
    'language.set.error.not_admin': string;
    'language.set.error.invalid_language': string;
    'language.current': string;
    'language.available': string;
    'error.generic': string;
    'error.api_failed': string;
    'duration.minute.one': string;
    'duration.minute.few'?: string;
    'duration.minute.many'?: string;
    'duration.minute.other': string;
    'duration.hour.one': string;
    'duration.hour.few'?: string;
    'duration.hour.many'?: string;
    'duration.hour.other': string;
    'duration.day.one': string;
    'duration.day.few'?: string;
    'duration.day.many'?: string;
    'duration.day.other'?: string;
}

/**
 * Translation key type for type-safe access
 */
export type TranslationKey = keyof Translations;
