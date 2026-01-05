import { ENABLED_LANGUAGES } from "./config";
import { isChatAdministrator } from './helpers/admins';
import { formatTranslation, getChatLanguage, setChatLanguage } from "./i18n";
import type { Env, LanguageCode, RestrictChatMemberPermissions, Message, InlineKeyboardMarkup, CallbackQuery } from "./types";

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
export function formatDuration(durationSeconds: number, languageCode?: LanguageCode): string {
    const MAX_DURATION = 86400; // 24 * 60 * 60 = 86400 seconds per day
    const SECONDS_PER_HOUR = 3600; // 60 * 60 = 3600 seconds per hour
    const SECONDS_PER_MINUTE = 60; // 60 seconds per minute

    // If duration is 1 day or more, return "1 day"
    if (durationSeconds >= MAX_DURATION) {
        return formatTranslation('duration.day', languageCode);
    }

    const hours = Math.floor(durationSeconds / SECONDS_PER_HOUR);
    const remainingSeconds = durationSeconds % SECONDS_PER_HOUR;
    const minutes = Math.floor(remainingSeconds / SECONDS_PER_MINUTE);

    // TODO: Improve multi-lang pluralism for minutes & hours

    const durationMinuteText = formatTranslation('duration.minute', languageCode, {
        amount: minutes.toString()
    })

    // If duration is 1 hour or more, show hours and minutes
    if (hours > 0) {
        const durationHourText = formatTranslation('duration.hour', languageCode, {
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

/**
 * Sends a message via Telegram Bot API
 */
export async function sendMessage(
    botToken: string,
    chatId: number,
    text: string,
    replyToMessageId?: number,
    options?: { replyMarkup?: InlineKeyboardMarkup }
): Promise<Response> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload: {
        chat_id: number;
        text: string;
        reply_to_message_id?: number;
        reply_markup?: InlineKeyboardMarkup;
    } = {
        chat_id: chatId,
        text: text,
    };

    if (replyToMessageId) {
        payload.reply_to_message_id = replyToMessageId;
    }

    if (options?.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
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
    message: Message,
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

    const chatLanguageCode = await getChatLanguage(chatId, env)

    // Calculate until_date (Unix timestamp)
    const untilDate = Math.floor(Date.now() / 1000) + durationSeconds;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const formattedDuration = formatDuration(durationSeconds, chatLanguageCode);

    console.log(`[MUTEME] Processing mute request: userId=${userId}, chatId=${chatId}, duration=${durationMinutes}m, untilDate=${untilDate}`);

    const isAdmin = await isChatAdministrator(env.TELEGRAM_BOT_TOKEN, chatId, userId);

    if (isAdmin) {
        console.log(`[MUTEME] User is an admin, cannot mute: userId=${userId}, chatId=${chatId}`);
        const replyMessage = formatTranslation('muteme.error.is_admin', chatLanguageCode);
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyMessage, message.message_id);
        return;
    }

    // Restrict the user
    const restrictResponse = await restrictChatMember(env.TELEGRAM_BOT_TOKEN, chatId, userId, untilDate);
    if (!restrictResponse.ok) {
        const errorText = await restrictResponse.text();
        console.error(`[MUTEME] Failed to restrict user: userId=${userId}, chatId=${chatId}, status=${restrictResponse.status}, error=${errorText}`);
        throw new Error(`Failed to restrict chat member: ${restrictResponse.status}`);
    }

    let replyMessage = formatTranslation('muteme.success', chatLanguageCode, {
        duration: formattedDuration
    });

    if (requestedDurationIsInvalid) {
        replyMessage += '\n'
        replyMessage += formatTranslation('muteme.invalid_duration', chatLanguageCode, {
            duration: requestedDuration || ''
        });
    } else if (requestedRudationIsCapped) {
        replyMessage += '\n'
        replyMessage += formatTranslation('muteme.duration_capped', chatLanguageCode);
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
    } else {
        console.log(`[MUTEME] Successfully muted user: userId=${userId}, chatId=${chatId}, duration=${durationMinutes}m`);
    }
}


/**
 * 
 */
export async function handleLangCommand(): Promise<void> {
    // Placeholder for future implementation
}

/**
 * Handles the /setlang command
 */
export async function sendSetLangPromptReply(
    message: Message,
    env: Env
): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;
    const chatLanguageCode = await getChatLanguage(chatId, env)

    // Check if user is an administrator
    if (!await isChatAdministrator(env.TELEGRAM_BOT_TOKEN, chatId, userId)) {
        console.log(`[i18n] Attempt to bypass admin command: userId=${userId}, chatId=${chatId}`);
        const replyMessage = formatTranslation('language.set.error.not_admin', chatLanguageCode)
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyMessage);
        return;
    }

    // Send prompt reply by default
    const replyMessage = formatTranslation('language.set.prompt', chatLanguageCode)
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyMessage, undefined, {
        replyMarkup: {
            inline_keyboard: [
                ENABLED_LANGUAGES.map(lang => ({
                    text: formatTranslation(`language.set.prompt.option.${lang}`, chatLanguageCode),
                    callback_data: lang
                }))
            ]
        }
    });
}

export async function answerCallbackQuery(callbackQueryId: string, text: string, env: Env) {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
    const payload = {
        callback_query_id: callbackQueryId,
        text: text,
        cache_time: 5
    };

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
}

export async function deleteMessage(chatId: number, messageId: number, env: Env): Promise<Response> {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/deleteMessage`;
    const payload = {
        chat_id: chatId,
        message_id: messageId
    };

    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
}

export async function handleSetLangCallbackQuery(callbackQuery: CallbackQuery, env: Env): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;
    const languageCode = callbackQuery?.data as LanguageCode;

    if (!chatId || !languageCode) {
        return;
    }

    const chatLanguageCode = await getChatLanguage(chatId, env)

    // Check if user is an administrator
    if (!await isChatAdministrator(env.TELEGRAM_BOT_TOKEN, chatId, userId)) {
        console.log(`[i18n] Attempt to bypass admin command: userId=${userId}, chatId=${chatId}`);
        const replyMessage = formatTranslation('language.set.error.not_admin', chatLanguageCode)
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyMessage);
        return;
    }

    // Validate language code
    if (!languageCode || ENABLED_LANGUAGES.indexOf(languageCode) === -1) {
        console.log(`[i18n] Invalid language code: userId=${userId}, chatId=${chatId}, languageCode=${languageCode}`);
        const replyMessage = formatTranslation('language.set.error.invalid_language', chatLanguageCode, {
            languages: ENABLED_LANGUAGES.toString()
        })
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, replyMessage);
        return;
    }

    await setChatLanguage(chatId, languageCode, env);
    
    const selectedInlineKeyboard = callbackQuery.message?.reply_markup?.inline_keyboard[0].find(keyboard => keyboard.callback_data === languageCode)?.text || languageCode;
    const replyMessage = formatTranslation('language.set.success', languageCode, {
        language: selectedInlineKeyboard
    })

    const cbQueryResponse = await answerCallbackQuery(callbackQuery.id, replyMessage, env);
    if (!cbQueryResponse.ok) {
        const errorText = await cbQueryResponse.text();
        console.error(`[i18n] Failed to answer callback query: userId=${userId}, chatId=${chatId}, status=${cbQueryResponse.status}, error=${errorText}`);
    } else {
        console.log(`[i18n] Answered cb query successfully: userId=${userId}, chatId=${chatId}, language=${languageCode}`);
    }

    const deleteMessageResponse = await deleteMessage(chatId, callbackQuery.message!.message_id, env);
    if (!deleteMessageResponse.ok) {
        const errorText = await deleteMessageResponse.text();
        console.error(`[i18n] Failed to delete message: userId=${userId}, chatId=${chatId}, status=${deleteMessageResponse.status}, error=${errorText}`);
    } else {
        console.log(`[i18n] Original prompt message deleted: userId=${userId}, chatId=${chatId}`);
    }
}
