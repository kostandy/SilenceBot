# SilenceBot

A Telegram bot that allows users to mute themselves in group chats. Deployed on Cloudflare Workers.

## Features

- `/muteme` command to mute yourself for 30 minutes (default)
- Optional duration arguments: `45m`, `1h`, `1d`
- Maximum mute duration: 1 day (enforced regardless of input)
- Deployed on Cloudflare Workers (free tier)

## Setup

### Prerequisites

- Node.js 18+ installed
- A Telegram bot token (get it from [@BotFather](https://t.me/BotFather))
- A Cloudflare account

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Add your Telegram bot token to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

4. Update `wrangler.toml` with your bot token (or use secrets):
   ```toml
   [env.production]
   vars = { TELEGRAM_BOT_TOKEN = "your_bot_token_here" }
   ```

   Alternatively, use Wrangler secrets (recommended for production):
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   ```

### Development

Run the worker locally:
```bash
npm run dev
```

### Deployment

1. Login to Cloudflare (if not already):
   ```bash
   wrangler login
   ```

2. Deploy the worker:
   ```bash
   npm run deploy
   ```

3. Note the deployed URL (e.g., `https://silencebot.your-subdomain.workers.dev`)

4. Set the webhook:
   ```bash
   chmod +x set-webhook.sh
   ./set-webhook.sh https://silencebot.your-subdomain.workers.dev
   ```

## Usage

Add the bot to a Telegram group and make sure it has admin permissions to restrict members.

Users can use the following commands:
- `/muteme` - Mute yourself for 30 minutes (default)
- `/muteme 45m` - Mute yourself for 45 minutes
- `/muteme 1h` - Mute yourself for 1 hour
- `/muteme 1d` - Mute yourself for 1 day (maximum)

The bot will respond with: "Thank you for taking care of yourself! See you later."

## Important Notes

- The bot must be an admin in the group with permission to restrict members
- Maximum mute duration is enforced at 1 day, even if a longer duration is specified
- The bot only works in group chats (supergroups)

## License

MIT

