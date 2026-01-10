import { DEFAULT_LANGUAGE, getTranslation, loadTranslations } from "../i18n";
import { getPluralCategory } from "../i18n/pluralRules";
import type { LanguageCode, TranslationKey } from "../i18n/types";

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
 * Formats a translation with pluralization support
 * Automatically selects the correct plural form based on the count
 * @param baseKey - Base translation key (e.g., 'duration.minute')
 * @param count - Number to determine plural form
 * @param languageCode - Language code ('en' or 'uk')
 * @param params - Additional parameters to replace in the translation
 * @returns Formatted translated string with correct plural form
 */
export function formatPluralTranslation(
    baseKey: string,
    count: number,
    languageCode: LanguageCode = DEFAULT_LANGUAGE,
    params: Record<string, string | number> = {}
): string {
    const pluralCategory = getPluralCategory(count, languageCode);
    const pluralKey = `${baseKey}.${pluralCategory}` as TranslationKey;
    
    // Fallback chain: try plural form, then 'other', then base key
    const translations = loadTranslations(languageCode);
    let translation = translations[pluralKey];
    
    if (!translation) {
        // Fallback to 'other' if specific plural form doesn't exist
        const otherKey = `${baseKey}.other` as TranslationKey;
        translation = translations[otherKey];
    }
    
    // Add count to params if not already present
    const allParams = { ...params, amount: count.toString() };
    
    // Replace all placeholders {key} with values from params
    let result = translation;
    for (const [paramKey, paramValue] of Object.entries(allParams)) {
        const placeholder = `{${paramKey}}`;
        result = result?.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
            String(paramValue)
        );
    }
    
    return result || '';
}

/**
 * Formats duration in seconds to a human-readable string
 * @param durationSeconds - Duration in seconds
 * @returns Formatted string (e.g., "30 minutes", "1 hour 20 minutes", "1 day")
 */
export function formatDuration(durationSeconds: number, languageCode?: LanguageCode): string {
    const MAX_DURATION = 86400; // 24 * 60 * 60 = 86400 seconds per day
    const SECONDS_PER_HOUR = 3600; // 60 * 60 = 3600 seconds per hour
    const SECONDS_PER_MINUTE = 60; // 60 seconds per minute

    // If duration is 1 day or more, return "1 day"
    if (durationSeconds >= MAX_DURATION) {
        return formatPluralTranslation('duration.day', 1, languageCode);
    }

    const hours = Math.floor(durationSeconds / SECONDS_PER_HOUR);
    const remainingSeconds = durationSeconds % SECONDS_PER_HOUR;
    const minutes = Math.floor(remainingSeconds / SECONDS_PER_MINUTE);

    const durationMinuteText = formatPluralTranslation('duration.minute', minutes, languageCode, {
        amount: minutes.toString()
    })

    // If duration is 1 hour or more, show hours and minutes
    if (hours > 0) {
        const durationHourText = formatPluralTranslation('duration.hour', hours, languageCode, {
            amount: hours.toString()
        })
        if (minutes === 0) {
            return durationHourText;
        }
        return `${durationHourText} ${durationMinuteText}`;
    }

    // Otherwise show only minutes
    return durationMinuteText;
}