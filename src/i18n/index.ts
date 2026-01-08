import { ENABLED_LANGUAGES } from '../config';
import type { Env } from '../types';
import type { LanguageCode, TranslationKey, Translations } from './types';
import englishTranslations from './english.json';
import ukrainianTranslations from './ukrainian.json';

/**
 * Translation cache loaded at module initialization
 */
export const translationsCache: Record<LanguageCode, Translations> = {
    en: englishTranslations as Translations,
    uk: ukrainianTranslations as Translations,
};

/**
 * Default language code (fallback)
 */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Loads translations for a specific language code
 * @param languageCode - Language code ('en' or 'uk')
 * @returns Translations object for the specified language
 */
export function loadTranslations(languageCode: LanguageCode): Translations {
    return translationsCache[languageCode] || translationsCache[DEFAULT_LANGUAGE];
}

/**
 * Gets a translation string by key and language code
 * Falls back to English if translation key is missing
 * @param key - Translation key
 * @param languageCode - Language code ('en' or 'uk')
 * @returns Translated string
 */
export function getTranslation(
    key: TranslationKey,
    languageCode: LanguageCode
): string | undefined {
    const translations = loadTranslations(languageCode);
    const translation = translations[key];

    // Fallback to English if translation is missing
    if (!translation && languageCode !== DEFAULT_LANGUAGE) {
        const defaultTranslations = translationsCache[DEFAULT_LANGUAGE];
        return defaultTranslations[key];
    }

    return translation;
}

/**
 * Formats a translation string with parameters
 * Replaces placeholders like {param} with actual values
 * @param key - Translation key
 * @param languageCode - Language code ('en' or 'uk')
 * @param params - Parameters to replace in the translation
 * @returns Formatted translated string
 */
export function formatTranslation(
    key: TranslationKey,
    languageCode: LanguageCode = DEFAULT_LANGUAGE,
    params: Record<string, string> = {}
): string {
    let translation = getTranslation(key, languageCode);

    // Replace all placeholders {key} with values from params
    for (const [paramKey, paramValue] of Object.entries(params)) {
        const placeholder = `{${paramKey}}`;
        translation = translation?.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), paramValue);
    }

    return translation || '';
}

/**
 * Retrieves the language preference for a chat from KV storage
 * Returns default language ('en') if not set or on error
 * @param chatId - Telegram chat ID
 * @param env - Environment variables with KV namespace
 * @returns Language code for the chat
 */
export async function getChatLanguage(chatId: number, env: Env): Promise<LanguageCode> {
    try {
        const key = `chat:${chatId}`;
        const storedLanguage = await env.CHAT_LANGUAGES.get(key) as LanguageCode;

        if (storedLanguage && ENABLED_LANGUAGES.includes(storedLanguage)) {
            return storedLanguage;
        }
    } catch (error) {
        console.error(`[I18N] Failed to get chat language for chatId=${chatId}:`, error);
    }

    return DEFAULT_LANGUAGE;
}

/**
 * Stores the language preference for a chat in KV storage
 * @param chatId - Telegram chat ID
 * @param languageCode - Language code to store ('en' or 'uk')
 * @param env - Environment variables with KV namespace
 */
export async function setChatLanguage(
    chatId: number,
    languageCode: LanguageCode,
    env: Env
): Promise<void> {
    try {
        const key = `chat:${chatId}`;
        await env.CHAT_LANGUAGES.put(key, languageCode);
        console.log(`[i18n] ${languageCode} has set in KV for chatId=${chatId}`);
    } catch (error) {
        console.error(`[i18n] Failed to set chat language for chatId=${chatId}:`, error);
        throw new Error(`Failed to store language preference: ${error instanceof Error ? error.message : String(error)}`);
    }
}

