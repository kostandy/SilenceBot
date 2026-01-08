import type { LanguageCode } from './types';

/**
 * CLDR plural categories
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Determines the plural category for a number in English
 * English has: one, other
 */
export function getEnglishPluralCategory(count: number): PluralCategory {
    if (count === 1) {
        return 'one';
    }
    return 'other';
}

/**
 * Determines the plural category for a number in Ukrainian
 * Ukrainian has: one, few, many, other
 * Rules:
 * - one: 1, 21, 31, 41... (ends in 1, but not 11)
 * - few: 2-4, 22-24, 32-34... (ends in 2-4, but not 12-14)
 * - many: 0, 5-20, 25-30... (ends in 0 or 5-9, or 11-14)
 * - other: fractions (not used for integers)
 */
export function getUkrainianPluralCategory(count: number): PluralCategory {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return 'one';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return 'few';
    }
    if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) {
        return 'many';
    }
    return 'other';
}

/**
 * Gets the plural category for a number based on language
 */
export function getPluralCategory(count: number, languageCode: LanguageCode): PluralCategory {
    switch (languageCode) {
        case 'en':
            return getEnglishPluralCategory(count);
        case 'uk':
            return getUkrainianPluralCategory(count);
        default:
            return getEnglishPluralCategory(count);
    }
}