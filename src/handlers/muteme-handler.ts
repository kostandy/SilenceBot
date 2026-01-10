import { formatPluralTranslation, parseDuration, formatDuration } from "../helpers";
import { getChatLanguage, formatTranslation } from "../i18n";
import { isChatAdministrator } from "../services/admin-service";
import { sendMessage, restrictChatMember, answerCallbackQuery, deleteMessage } from "../services/telegram-api";
import type { Env, CallbackQuery, Message } from "../types";
import { isNumberWithoutUnit } from "../utils/duration";

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

    const chatLanguageCode = await getChatLanguage(chatId, env);

    // Check if user provided a number without unit (e.g., "12")
    if (requestedDuration) {
        const numberValue = isNumberWithoutUnit(requestedDuration);
        if (numberValue !== null) {
            // Send prompt with inline keyboard buttons
            const promptMessage = formatTranslation('muteme.prompt', chatLanguageCode);
            const minutesText = formatPluralTranslation('muteme.prompt.option.minute', numberValue, chatLanguageCode, {
                amount: numberValue.toString()
            });
            const hoursText = formatPluralTranslation('muteme.prompt.option.hour', numberValue, chatLanguageCode, {
                amount: numberValue.toString()
            });

            // Include user ID in callback data to ensure only the original author can select
            await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, promptMessage, message.message_id, {
                replyMarkup: {
                    inline_keyboard: [
                        [
                            {
                                text: minutesText,
                                callback_data: `muteme:${userId}:${numberValue}:m`
                            },
                            {
                                text: hoursText,
                                callback_data: `muteme:${userId}:${numberValue}:h`
                            }
                        ]
                    ]
                }
            });
            return;
        }
    }

    let requestedDurationIsInvalid = false;
    let requestedRudationIsCapped = false;

    if (requestedDuration) {
        const parsedDuration = parseDuration(requestedDuration);
        if (parsedDuration !== null) {
            durationSeconds = parsedDuration;
            // Log if duration was capped at max
            // 86400 = 24 * 60 * 60 = 1 day in seconds
            if (parsedDuration > 86400) {
                console.log(`[MUTEME] Duration capped at max: requested=${requestedDuration}, original=${parsedDuration}, capped=86400`);
                requestedRudationIsCapped = true;
            }
        } else {
            console.log(`[MUTEME] Invalid duration format: "${requestedDuration}", using default 30m`);
            requestedDurationIsInvalid = true;
        }
    } else {
        // If no duration was provided, send 3 buttons: 30m, 8h, 1d
        const promptMessage = formatTranslation('muteme.prompt', chatLanguageCode);
        const defaultMinutesText = formatPluralTranslation('muteme.prompt.option.minute', 30, chatLanguageCode, {
            amount: '30'
        });
        const defaultHoursText = formatPluralTranslation('muteme.prompt.option.hour', 8, chatLanguageCode, {
            amount: '8'
        });
        const defaultDaysText = formatPluralTranslation('muteme.prompt.option.day', 1, chatLanguageCode, {
            amount: '1'
        });

        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, promptMessage, message.message_id, {
            replyMarkup: {
                inline_keyboard: [
                    [
                        {
                            text: defaultMinutesText,
                            callback_data: `muteme:${userId}:30:m`
                        },
                        {
                            text: defaultHoursText,
                            callback_data: `muteme:${userId}:8:h`
                        },
                        {
                            text: defaultDaysText,
                            callback_data: `muteme:${userId}:1:d`
                        }
                    ]
                ]
            }
        });
        return;
    }

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
 * Handles callback queries for /muteme command (when user selects minutes or hours)
 */
export async function handleMutemeCallbackQuery(callbackQuery: CallbackQuery, env: Env): Promise<void> {
    const chatId = callbackQuery.message?.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (!chatId || !data) {
        return;
    }

    // Parse callback data: "muteme:{userId}:{amount}:{unit}" (e.g., "muteme:123456:12:m")
    const match = data.match(/^muteme:(\d+):(\d+):([mhd])$/);
    if (!match) {
        console.error(`[MUTEME] Invalid callback data format: ${data}`);
        return;
    }

    const authorizedUserId = parseInt(match[1], 10);
    const amount = parseInt(match[2], 10);
    const unit = match[3];

    // Verify that only the original command author can select the button
    if (userId !== authorizedUserId) {
        console.log(`[MUTEME] Unauthorized button click: authorizedUserId=${authorizedUserId}, actualUserId=${userId}, chatId=${chatId}`);
        const chatLanguageCode = await getChatLanguage(chatId, env);
        const errorMessage = formatTranslation('muteme.error.unauthorized', chatLanguageCode);
        await answerCallbackQuery(callbackQuery.id, errorMessage, env);
        return;
    }

    // Calculate duration in seconds
    let durationSeconds: number;
    switch (unit) {
        case 'm':
            durationSeconds = amount * 60; // 60 seconds per minute
            break;
        case 'h':
            durationSeconds = amount * 3600; // 60 * 60 = 3600 seconds per hour
            break;
        case 'd':
            durationSeconds = 86400; // 24 * 60 * 60 = 86400 seconds per day
            break;
        default:
            console.error(`[MUTEME] Invalid unit: ${unit}`);
            return;
    }

    // Cap at maximum duration (1 day)
    const MAX_DURATION = 86400; // 24 * 60 * 60 = 86400
    durationSeconds = Math.min(durationSeconds, MAX_DURATION);

    const chatLanguageCode = await getChatLanguage(chatId, env);

    // Check if user is an admin (admins cannot mute themselves)
    const isAdmin = await isChatAdministrator(env.TELEGRAM_BOT_TOKEN, chatId, userId);
    if (isAdmin) {
        console.log(`[MUTEME] User is an admin, cannot mute: userId=${userId}, chatId=${chatId}`);
        const replyMessage = formatTranslation('muteme.error.is_admin', chatLanguageCode);
        await answerCallbackQuery(callbackQuery.id, replyMessage, env);
        return;
    }

    // Calculate until_date (Unix timestamp)
    const untilDate = Math.floor(Date.now() / 1000) + durationSeconds;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const formattedDuration = formatDuration(durationSeconds, chatLanguageCode);

    console.log(`[MUTEME] Processing mute request from callback: userId=${userId}, chatId=${chatId}, duration=${durationMinutes}m, untilDate=${untilDate}`);

    // Restrict the user
    const restrictResponse = await restrictChatMember(env.TELEGRAM_BOT_TOKEN, chatId, userId, untilDate);
    if (!restrictResponse.ok) {
        const errorText = await restrictResponse.text();
        console.error(`[MUTEME] Failed to restrict user: userId=${userId}, chatId=${chatId}, status=${restrictResponse.status}, error=${errorText}`);
        const errorMessage = formatTranslation('error.api_failed', chatLanguageCode);
        await answerCallbackQuery(callbackQuery.id, errorMessage, env);
        return;
    }

    // Delete the prompt message with buttons
    if (callbackQuery.message) {
        const deleteResponse = await deleteMessage(chatId, callbackQuery.message.message_id, env);
        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error(`[MUTEME] Failed to delete prompt message: userId=${userId}, chatId=${chatId}, status=${deleteResponse.status}, error=${errorText}`);
        }
    }

    // Send success message
    const replyMessage = formatTranslation('muteme.success', chatLanguageCode, {
        duration: formattedDuration
    });

    const sendResponse = await sendMessage(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        replyMessage,
        (callbackQuery.message as Message)?.reply_to_message?.message_id || undefined
    );

    if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error(`[MUTEME] Failed to send confirmation: userId=${userId}, chatId=${chatId}, status=${sendResponse.status}, error=${errorText}`);
    } else {
        console.log(`[MUTEME] Successfully muted user: userId=${userId}, chatId=${chatId}, duration=${durationMinutes}m`);
    }
}