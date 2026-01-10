import type { ChatMember } from '../types';

const ADMIN_ROLES = ['administrator', 'creator'];

export const isChatAdministrator = async (botToken: string, chatId: number, userId: number): Promise<boolean> => {
    try {
        const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
        const response: Response = await fetch(url);
        const data: { result: ChatMember } = await response.json();
        console.log(`[ADMIN_CHECK] userId=${userId}, chatId=${chatId}, status=${data.result.status}`);
        return ADMIN_ROLES.indexOf(data.result?.status) !== -1;
    } catch (error) {
        console.error(`[ADMIN_CHECK] Failed to check if user is administrator: ${error as Error}`);
        return false;
    }
}