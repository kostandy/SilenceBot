/**
 * Checks if a string is a number without a unit (e.g., "12" but not "12m")
 * @param input - Input string to check
 * @returns The number if it's a valid number without unit, null otherwise
 */
export function isNumberWithoutUnit(input: string): number | null {
    const numberMatch = input.match(/^(\d+)$/);
    if (numberMatch) {
        const value = parseInt(numberMatch[1], 10);
        if (value > 0) {
            return value;
        }
    }
    return null;
}