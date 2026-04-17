#!/bin/bash
# Automatically updates Telegram bot menu button URL when tunnel restarts
BOT_TOKEN="8420215181:AAGmLpXlLEMm8b5B2_nWDWneeE1krTQNEHA"
LOG="$HOME/.pm2/logs/minigames-tunnel-error.log"

while true; do
  # Wait for new URL in logs
  URL=$(tail -50 "$LOG" | grep -o 'https://[a-f0-9]*\.lhr\.life' | tail -1)

  if [ -n "$URL" ]; then
    # Test if URL is alive
    STATUS=$(curl -s "$URL/api/cases" -o /dev/null -w "%{http_code}" 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
      SAVED=$(cat /tmp/minigames_url 2>/dev/null)
      if [ "$URL" != "$SAVED" ]; then
        # Update Telegram bot
        RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \
          -H "Content-Type: application/json" \
          -d "{\"menu_button\": {\"type\": \"web_app\", \"text\": \"Play\", \"web_app\": {\"url\": \"${URL}\"}}}")
        echo "$(date): Updated URL to $URL → $RESULT"
        echo "$URL" > /tmp/minigames_url
      fi
    fi
  fi

  sleep 30
done
