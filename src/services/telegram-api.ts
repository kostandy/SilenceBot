import type { Env, InlineKeyboardMarkup, RestrictChatMemberPermissions } from "../types";

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
 * Calls Telegram API to answer a callback query
 */
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

/**
 * Calls Telegram API to delete a message
 */
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