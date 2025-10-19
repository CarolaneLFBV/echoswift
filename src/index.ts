/**
 * Swift Feed Bot
 * Discord bot that posts Swift.org articles
 */

import { loadConfig } from './config.js';
import { createDiscordClient } from './bot.js';
import { startScheduler } from './scheduler.js';

async function main() {
  console.log(`[${new Date().toISOString()}] 🚀 Starting Swift Feed Bot...`);

  try {
    // Load configuration
    const config = loadConfig();
    console.log(`[${new Date().toISOString()}] ✅ Configuration loaded`);
    console.log(`[${new Date().toISOString()}] - Feed URL: ${config.feed.url}`);
    console.log(`[${new Date().toISOString()}] - Timezone: ${config.timezone}`);
    console.log(`[${new Date().toISOString()}] - Environment: ${config.env}`);

    // Create and login Discord client
    const client = await createDiscordClient(config);

    // Start scheduler
    startScheduler(client, config);

    console.log(`[${new Date().toISOString()}] 🎉 Bot is ready and running!`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Fatal error:`, error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});

// Start bot
main();
