import type { Env, Update } from "./types";
import { handleMutemeCommand, handleSetLangCallbackQuery, sendSetLangPromptReply as sendSetLangPromptReply } from "./helpers";

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
      const update: Update = await request.json();
      const message = update.message;

      // Handle message updates
      if (message && message.text) {

        if (message.text!.startsWith('/muteme')) {
          await handleMutemeCommand(message, env);
        } else if (message.text!.startsWith('/setlang')) {
          await sendSetLangPromptReply(message, env);
        }

      // Handle callback query updates
      } else if (Object.hasOwn(update, 'callback_query')) {
        await handleSetLangCallbackQuery(update.callback_query!, env);
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[ERROR] Failed to process request: ${errorMessage}`, errorStack ? { stack: errorStack } : '');
      return new Response('Internal server error', { status: 500 });
    }
  },
};

