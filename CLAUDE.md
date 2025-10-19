# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Swift Feed Bot is a Discord bot that automatically fetches and posts Swift.org blog articles. Built with Bun runtime, TypeScript, and discord.js, it runs on a scheduled basis (noon and midnight) to check for new articles and post them as formatted Discord embeds with role notifications.

## Development Commands

```bash
# Local development (with hot reload)
bun run dev

# Production mode
bun start

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Install dependencies
bun install
```

## Docker Commands

```bash
# Build Docker image locally
docker build -t echoswift:latest .

# Run with docker-compose
docker compose up -d

# View logs
docker logs -f echoswift

# Stop and remove container
docker compose down

# Rebuild and restart
docker compose up -d --force-recreate --build
```

## Architecture Overview

### Application Flow

1. **Startup** (`src/index.ts`): Loads configuration → Creates Discord client → Starts scheduler
2. **Scheduler** (`src/scheduler.ts`): Cron job runs at noon and midnight (timezone-aware)
3. **Feed Check Workflow**: Fetch feed → Parse XML → Filter new articles → Post to Discord → Update storage
4. **Storage**: JSON file (`data/posted-articles.json`) tracks posted article IDs to prevent duplicates

### Key Components

**Configuration Layer** (`src/config.ts`)
- Loads and validates environment variables
- Provides typed config object throughout the application
- Required vars: `DISCORD_TOKEN`, `CHANNEL_ID`, `ROLE_ID`

**Feed Processing** (`src/feed/`)
- `fetcher.ts`: HTTP client with exponential backoff retry (3 attempts: 2s, 4s, 8s)
- `parser.ts`: Atom/RSS feed parser using `rss-parser`, extracts article metadata
- `storage.ts`: JSON persistence with atomic writes, automatic cleanup of articles >30 days old

**Discord Integration** (`src/discord/`)
- `embeds.ts`: Creates Discord embeds with Swift orange color (#F05138), respects Discord limits (title ≤256 chars, description ≤4096 chars)
- `poster.ts`: Handles message posting with rate limiting (2s delay between posts), validates permissions before posting

**Bot Client** (`src/bot.ts`)
- Discord.js client with required intents: Guilds, GuildMessages
- Event handlers for ready, error, and warn events
- Required Discord permissions: SendMessages, EmbedLinks, MentionEveryone

### Critical Implementation Details

**Development Mode Behavior**: When `NODE_ENV=development`, the scheduler runs an immediate feed check on startup for testing purposes. In production, it waits for the scheduled cron times.

**Article Deduplication**: Articles are identified by their `id` field from the feed (falls back to `guid` or `link`). The storage module maintains a Set of posted article IDs, automatically cleaning up entries older than 30 days to prevent unbounded growth.

**Error Handling Strategy**: The scheduler's `checkFeedAndPost` function catches and logs errors without re-throwing, ensuring that a single failure doesn't crash the scheduler. Individual article posting failures don't prevent subsequent articles from being posted.

**Rate Limiting**: Discord enforces ~5 messages per 5 seconds per channel. The bot implements a conservative 2-second delay between posts to stay well within limits.

**Atomic Storage Writes**: Storage updates write to a temporary file first, then atomically rename to prevent corruption. A backup file is created before each write operation.

## Environment Configuration

Required `.env` variables:

```env
DISCORD_TOKEN=            # Discord bot token from Developer Portal
CHANNEL_ID=              # Target Discord channel ID (enable Developer Mode to copy)
ROLE_ID=                 # Role ID to mention in notifications
FEED_URL=                # Default: https://www.swift.org/atom.xml
TIMEZONE=                # Default: Europe/Paris (for cron scheduling)
NODE_ENV=                # development or production
```

## Deployment Architecture

**Production Stack**: Docker + Docker Compose + Traefik
- Container connects to external `traefik-network` (must exist before deployment)
- Traefik routing disabled (bot has no HTTP endpoints)
- Volume mount: `./data:/app/data` for persistent storage
- Logging: JSON driver with 10MB max file size, 3 file rotation

**CI/CD Pipeline** (`.github/workflows/deploy.yml`):
1. On push to `main`: Run tests → Build Docker image → Push to GHCR
2. SSH to VPS → Pull latest image → Recreate container
3. Required GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
4. VPS deployment path: `/opt/echoswift`

**Multi-stage Dockerfile**:
- Stage 1 (builder): Install dependencies with frozen lockfile
- Stage 2 (production): Copy artifacts, create non-root user (botuser:1001), set up data volume
- Security: Runs as non-root user, minimal attack surface

## Customization Guide

**Modify Scheduler Frequency** (`src/scheduler.ts:80`):
```typescript
const cronPattern = '0 12,0 * * *';  // Current: noon and midnight
// Examples:
// '0 */6 * * *'      // Every 6 hours
// '0 9,12,18 * * *'  // 9am, noon, 6pm
```

**Customize Embed Appearance** (`src/discord/embeds.ts`):
```typescript
const SWIFT_ORANGE = 0xF05138;  // Color code
// Add thumbnail: .setThumbnail('https://example.com/logo.png')
// Add image: .setImage('https://example.com/banner.png')
```

**Change Feed Source**: Update `FEED_URL` environment variable to any valid Atom/RSS feed URL.

## Troubleshooting

**Bot doesn't post articles**:
- Check storage file: `docker exec echoswift cat /app/data/posted-articles.json`
- Verify feed is accessible: `curl https://www.swift.org/atom.xml`
- In development mode, bot runs check immediately on startup for debugging

**Permission errors**:
- Bot requires: SendMessages, EmbedLinks, MentionEveryone
- Re-invite bot using OAuth2 URL Generator with correct permissions

**Storage corruption**:
- Backup file available at `data/posted-articles.backup.json`
- Can safely delete storage file; bot will recreate it (will re-post all articles in feed)

**Traefik network issues**:
- Ensure network exists: `docker network create traefik-network`
- Network is external to docker-compose and must be created manually
