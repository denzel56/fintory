---
name: platform-telegram-bot
description: "Use for future Telegram bot projects: commands, handlers, callback queries, state machines, webhooks/polling, and token safety."
---

# Telegram Bot Platform

- Keep the bot token out of source code and logs.
- Separate command handlers, callback query handlers, and domain services.
- Validate all user-provided text and callback data.
- Design conversational state explicitly; avoid implicit global state.
- Consider rate limits and duplicate update delivery.
- Choose webhook or polling deliberately based on deployment constraints.
- Keep side effects idempotent where retries are possible.
