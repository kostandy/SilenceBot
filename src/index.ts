import type { Env, TelegramUpdate } from "./types";
import { handleMutemeCommand, handleSetLangCommand } from "./helpers";

/**
 * Telegram bot for self-muting in group chats
 * Deployed on Cloudflare Workers
 */

/**
 * Main request handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const update: TelegramUpdate = await request.json();

      // Check if this is a message update
      if (update.message && update.message.text) {
        const message = update.message;

        // Handle /muteme command
        if (message.text!.startsWith('/muteme')) {
          await handleMutemeCommand(message, env);
        } else if (message.text!.startsWith('/setlang')) {
          await handleSetLangCommand(message, env);
        }
      } else {
        // Log non-command updates for observability (only in case of unexpected structure)
        if (update.message && !update.message.text) {
          console.log(`[UPDATE] Received message without text: updateId=${update.update_id}, chatId=${update.message.chat.id}, type=${update.message.chat.type}`);
        }
      }

      // Always return OK to Telegram
      return new Response('OK', { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[ERROR] Failed to process request: ${errorMessage}`, errorStack ? { stack: errorStack } : '');
      return new Response('Internal server error', { status: 500 });
    }
  },
};

