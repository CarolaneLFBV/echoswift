/**
 * Configuration loader
 * Reads environment variables and provides typed config
 */

export interface Config {
  discord: {
    token: string;
    channelId: string;
    roleId: string;
  };
  feed: {
    url: string;
  };
  timezone: string;
  env: string;
}

export function loadConfig(): Config {
  const requiredEnvVars = [
    'DISCORD_TOKEN',
    'CHANNEL_ID',
    'ROLE_ID',
  ];

  // Validate required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    discord: {
      token: process.env.DISCORD_TOKEN!,
      channelId: process.env.CHANNEL_ID!,
      roleId: process.env.ROLE_ID!,
    },
    feed: {
      url: process.env.FEED_URL || 'https://www.swift.org/atom.xml',
    },
    timezone: process.env.TIMEZONE || 'Europe/Paris',
    env: process.env.NODE_ENV || 'development',
  };
}
