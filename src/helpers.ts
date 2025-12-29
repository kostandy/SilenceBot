import type { Env, RestrictChatMemberPermissions, TelegramMessage } from "./types";

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

/**
 * Formats duration in seconds to a human-readable string
 * @param durationSeconds - Duration in seconds
 * @returns Formatted string (e.g., "30 minutes", "1 hour 20 minutes", "1 day")
 */
export function formatDuration(durationSeconds: number): string {
    const MAX_DURATION = 86400; // 24 * 60 * 60 = 86400 seconds per day
    const SECONDS_PER_HOUR = 3600; // 60 * 60 = 3600 seconds per hour
    const SECONDS_PER_MINUTE = 60; // 60 seconds per minute

    // If duration is 1 day or more, return "1 day"
    if (durationSeconds >= MAX_DURATION) {
        return '1 day';
    }

    const hours = Math.floor(durationSeconds / SECONDS_PER_HOUR);
    const remainingSeconds = durationSeconds % SECONDS_PER_HOUR;
    const minutes = Math.floor(remainingSeconds / SECONDS_PER_MINUTE);

    const hoursPostfix = hours > 1 ? 's' : '';
    const minutesPostfix = minutes > 1 ? 's' : '';

    // If duration is 1 hour or more, show hours and minutes
    if (hours > 0) {
        if (minutes === 0) {
            return `${hours} hour${hoursPostfix}`;
        }
        return `${hours} hour${hoursPostfix} ${minutes} minute${minutesPostfix}`;
    }

    // Otherwise show only minutes
    return `${minutes} minute${minutesPostfix}`;
}

/**
 * Sends a message via Telegram Bot API
 */
export async function sendMessage(
    botToken: string,
    chatId: number,
    text: string,
    replyToMessageId?: number
): Promise<Response> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: {
        chat_id: number;
        text: string;
        reply_to_message_id?: number;
    } = {
        chat_id: chatId,
        text: text,
    };

    if (replyToMessageId) {
        payload.reply_to_message_id = replyToMessageId;
    }

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
}

/**
 * Calls Telegram Bot API to restrict a chat member
 */
export async function restrictChatMember(
    botToken: string,
    chatId: number,
    userId: number,
    untilDate: number
): Promise<Response> {
    const permissions: RestrictChatMemberPermissions = {
        can_send_messages: false
    };

    const url = `https://api.telegram.org/bot${botToken}/restrictChatMember`;
    const body = JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        until_date: untilDate,
        permissions: permissions,
    });

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: body,
    });
}

/**
 * Handles the /muteme command
 */
export async function handleMutemeCommand(
    message: TelegramMessage,
    env: Env
): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    // Parse command arguments
    const args = text.split(/\s+/).slice(1);
    let durationSeconds = 1800; // Default: 30 minutes (30 * 60 = 1800 seconds)
    const requestedDuration = args.length > 0 ? args[0] : null;

    let requestedDurationIsInvalid = false;
    let requestedRudationIsCapped = false;

    if (requestedDuration) {
        const parsedDuration = parseDuration(requestedDuration);
        if (parsedDuration !== null) {
            durationSeconds = parsedDuration;
            // Log if duration was capped at max
            if (parsedDuration > 86400) {
                console.log(`[MUTEME] Duration capped at max: requested=${requestedDuration}, original=${parsedDuration}, capped=86400`);
                requestedRudationIsCapped = true;
            }
        } else {
            console.log(`[MUTEME] Invalid duration format: "${requestedDuration}", using default 30m`);
            requestedDurationIsInvalid = true;
        }
    }

    // Calculate until_date (Unix timestamp)
    const untilDate = Math.floor(Date.now() / 1000) + durationSeconds;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const formattedDuration = formatDuration(durationSeconds);

    console.log(`[MUTEME] Processing mute request: userId=${userId}, chatId=${chatId}, duration=${durationMinutes}m, untilDate=${untilDate}`);

    // Restrict the user
    const restrictResponse = await restrictChatMember(env.TELEGRAM_BOT_TOKEN, chatId, userId, untilDate);
    if (!restrictResponse.ok) {
        const errorText = await restrictResponse.text();
        console.error(`[MUTEME] Failed to restrict user: userId=${userId}, chatId=${chatId}, status=${restrictResponse.status}, error=${errorText}`);
        throw new Error(`Failed to restrict chat member: ${restrictResponse.status}`);
    }

    let replyMessage = `You have been muted for ${formattedDuration}. Take care of yourself!`;

    if (requestedDurationIsInvalid) {
        replyMessage += `\n(Note: Invalid duration format "${requestedDuration}". Defaulted to 30 minutes)`;
    } else if (requestedRudationIsCapped) {
        replyMessage += `\n(Note: Duration capped at maximum of 1 day)`;
    }

    // Send success message
    const sendResponse = await sendMessage(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        replyMessage,
        message.message_id
    );
    if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error(`[MUTEME] Failed to send confirmation: userId=${userId}, chatId=${chatId}, status=${sendResponse.status}, error=${errorText}`);
        // Don't throw here - mute was successful, just logging the message send failure
    } else {
        console.log(`[MUTEME] Successfully muted user: userId=${userId}, chatId=${chatId}, duration=${durationMinutes}m`);
    }
}