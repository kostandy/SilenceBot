import { getChatLanguage, setChatLanguage } from "../i18n";
import { formatTranslation } from "../utils/formatting";
import { isChatAdministrator } from "../services/admin-service";
import { answerCallbackQuery, deleteMessage, sendMessage } from "../services/telegram-api";
import type { CallbackQuery, Env, Message } from "../types";
import { ENABLED_LANGUAGES } from "../config";
import type { LanguageCode } from "../i18n/types";

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
                    text: formatTranslation(`language.set.prompt.option.${lang as LanguageCode}`, chatLanguageCode),
                    callback_data: lang
                }))
            ]
        }
    });
}

/**
 * Handles callback queries for /setlang command
 */
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

    if (!callbackQuery?.message || !('text' in callbackQuery.message)) {
        console.log(`[i18n] Inaccessible message: userId=${userId}, chatId=${chatId}`);
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