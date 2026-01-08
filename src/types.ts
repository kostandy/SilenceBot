import type { LanguageCode } from "./i18n/types";

/**
 * Language preference stored in KV (chatId -> languageCode)
 */
export interface ChatLanguage {
    chatId: number;
    languageCode: LanguageCode;
}

export interface Env {
    TELEGRAM_BOT_TOKEN: string;
    CHAT_LANGUAGES: KVNamespace;
}

export interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
}

export interface InlineKeyboardButton {
    text: string;
    callback_data: string;
}

export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
}

export interface Chat {
    id: number;
    type: "private" | "group" | "supergroup" | "channel";
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: boolean;
    is_direct_messages?: boolean;
}

export interface Message {
    message_id: number;
    from: User;
    chat: {
        id: number;
        type: string;
        title?: string;
    };
    text: string;
    date: number;
    reply_markup?: InlineKeyboardMarkup;
}

export interface InaccessibleMessage {
    chat: Chat;
    message_id: number;
    date: number;
}

export type MaybeInaccessibleMessage = Message | InaccessibleMessage;

export interface CallbackQuery {
    id: string;
    from: User;
    message?: MaybeInaccessibleMessage;
    data: string;
}

export interface Update {
    update_id: number;
    message?: Message;
    callback_query?: CallbackQuery;
}

export interface RestrictChatMemberPermissions {
    can_send_messages: boolean;
}

export type ChatMemberStatus = 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';

// In reality there's more fields in the response, but we only need the status
export interface ChatMember {
    status: ChatMemberStatus;
}