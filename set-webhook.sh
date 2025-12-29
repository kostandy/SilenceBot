#!/bin/bash

# Script to set Telegram webhook for the bot
# Usage: ./set-webhook.sh <worker-url>
# Example: ./set-webhook.sh https://silencebot.your-subdomain.workers.dev

set -e

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create it with TELEGRAM_BOT_TOKEN variable."
    exit 1
fi

# Load environment variables from .env file
export $(cat .env | grep -v '^#' | xargs)

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN is not set in .env file."
    exit 1
fi

# Get webhook URL from command line argument or use default
if [ -z "$1" ]; then
    echo "Usage: ./set-webhook.sh <worker-url>"
    echo "Example: ./set-webhook.sh https://silencebot.your-subdomain.workers.dev"
    exit 1
fi

WEBHOOK_URL="$1/webhook"

echo "Setting webhook URL: $WEBHOOK_URL"
echo "Using bot token: ${TELEGRAM_BOT_TOKEN:0:10}..."

# Set the webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "Response from Telegram API:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Check if webhook was set successfully
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo ""
    echo "✓ Webhook set successfully!"
else
    echo ""
    echo "✗ Failed to set webhook. Please check the error above."
    exit 1
fi

