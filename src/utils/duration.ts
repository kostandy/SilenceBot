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

/**
 * Parses duration string (e.g., "30m", "1h", "1d") to seconds
 * Maximum allowed duration is 1 day (86400 seconds)
 * @param input - Duration string (e.g., "45m", "1h", "1d")
 * @returns Duration in seconds, or null if invalid
 */
export function parseDuration(input: string): number | null {
    const match = input.match(/^(\d+)([mhd])$/i);
    if (!match) {
        return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (value <= 0) {
        return null;
    }

    let seconds: number;
    switch (unit) {
        case 'm':
            seconds = value * 60; // 60 seconds per minute
            break;
        case 'h':
            seconds = value * 3600; // 60 * 60 = 3600 seconds per hour
            break;
        case 'd':
            seconds = value * 86400; // 24 * 60 * 60 = 86400 seconds per day
            break;
        default:
            return null;
    }

    // Maximum duration is 1 day (86400 seconds)
    const MAX_DURATION = 86400; // 24 * 60 * 60 = 86400
    return Math.min(seconds, MAX_DURATION);
}