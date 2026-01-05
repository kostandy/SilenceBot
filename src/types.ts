/**
 * Supported language codes
 */
export type LanguageCode = 'en' | 'uk';

/**
 * Translation keys and their values
 */
export interface Translations {
    'muteme.success': string;
    'muteme.error.is_admin': string;
    'muteme.invalid_duration': string;
    'muteme.duration_capped': string;
    'language.set.prompt': string;
    "language.set.prompt.option.en": string;
    "language.set.prompt.option.uk": string;
    'language.set.success': string;
    'language.set.error.not_admin': string;
    'language.set.error.invalid_language': string;
    'language.current': string;
    'language.available': string;
    'error.generic': string;
    'error.api_failed': string;
    'duration.minute': string;
    'duration.hour': string;
    'duration.day': string;
}

/**
 * Translation key type for type-safe access
 */
export type TranslationKey = keyof Translations;

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

export interface CallbackQuery {
    id: string;
    from: User;
    message?: Message;
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