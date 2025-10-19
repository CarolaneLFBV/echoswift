/**
 * Discord bot client
 * Handles connection and authentication
 */

import { Client, GatewayIntentBits, Events } from 'discord.js';
import type { Config } from './config.js';

/**
 * Create and login Discord client
 */
export async function createDiscordClient(config: Config): Promise<Client> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // Event handlers
  client.once(Events.ClientReady, (readyClient) => {
    console.log(
      `[${new Date().toISOString()}] ✅ Bot logged in as ${readyClient.user.tag}`
    );
  });

  client.on(Events.Error, (error) => {
    console.error(`[${new Date().toISOString()}] Discord client error:`, error);
  });

  client.on(Events.Warn, (warning) => {
    console.warn(`[${new Date().toISOString()}] Discord client warning:`, warning);
  });

  // Login
  try {
    await client.login(config.discord.token);
    return client;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to login:`, error);
    throw error;
  }
}
