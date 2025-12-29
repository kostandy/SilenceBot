export interface Env {
    TELEGRAM_BOT_TOKEN: string;
}

export interface TelegramMessage {
    message_id: number;
    from: {
        id: number;
        is_bot: boolean;
        first_name: string;
        username?: string;
    };
    chat: {
        id: number;
        type: string;
        title?: string;
    };
    text?: string;
    date: number;
}

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
}

export interface RestrictChatMemberPermissions {
    can_send_messages: boolean;
}