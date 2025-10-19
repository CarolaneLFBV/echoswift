/**
 * Cron scheduler for feed checking
 * Runs at noon (12:00) and midnight (00:00) in configured timezone
 */

import cron from 'node-cron';
import type { Client } from 'discord.js';
import type { Config } from './config.js';
import { fetchWithRetry } from './feed/fetcher.js';
import { parseFeed } from './feed/parser.js';
import { loadPostedArticles, markArticleAsPosted } from './feed/storage.js';
import { postArticles } from './discord/poster.js';

/**
 * Check feed and post new articles
 */
async function checkFeedAndPost(client: Client, config: Config, maxArticles?: number): Promise<void> {
  console.log(`[${new Date().toISOString()}] 🔄 Starting feed check...`);

  try {
    // Fetch feed
    const xml = await fetchWithRetry(config.feed.url);

    // Parse articles
    const articles = await parseFeed(xml);

    if (articles.length === 0) {
      console.log(`[${new Date().toISOString()}] No articles found in feed`);
      return;
    }

    // Load posted articles
    const postedIds = await loadPostedArticles();

    // Filter new articles (not yet posted)
    let newArticles = articles.filter(article => !postedIds.has(article.id));

    if (newArticles.length === 0) {
      console.log(`[${new Date().toISOString()}] No new articles to post`);
      return;
    }

    console.log(
      `[${new Date().toISOString()}] Found ${newArticles.length} new articles (${articles.length} total in feed)`
    );

    // Sort by date (oldest first)
    newArticles.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());

    // Limit number of articles if specified (for initial sync)
    if (maxArticles && newArticles.length > maxArticles) {
      console.log(`[${new Date().toISOString()}] Limiting to ${maxArticles} most recent articles`);
      newArticles = newArticles.slice(-maxArticles); // Take last N articles (most recent)
    }

    // Post articles
    await postArticles(
      client,
      config.discord.channelId,
      config.discord.roleId,
      newArticles
    );

    // Mark articles as posted
    for (const article of newArticles) {
      await markArticleAsPosted(article.id);
    }

    console.log(
      `[${new Date().toISOString()}] ✅ Successfully posted ${newArticles.length} new articles`
    );

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error during feed check:`, error);
    // Don't throw - let scheduler continue running
  }
}

/**
 * Initial sync - post the 2 most recent articles on first run
 */
async function initialSync(client: Client, config: Config): Promise<void> {
  console.log(`[${new Date().toISOString()}] 🎬 Running initial sync - posting 2 most recent articles...`);
  await checkFeedAndPost(client, config, 2);
}

/**
 * Start cron scheduler
 * Runs at 12:00 and 00:00 in configured timezone
 */
export function startScheduler(client: Client, config: Config): void {
  // Cron pattern: minute hour day month weekday
  // '0 12,0 * * *' = At minute 0 past hour 12 and 0 (noon and midnight)
  const cronPattern = '0 12,0 * * *';

  console.log(
    `[${new Date().toISOString()}] 📅 Starting scheduler (pattern: ${cronPattern}, timezone: ${config.timezone})`
  );

  const task = cron.schedule(
    cronPattern,
    () => checkFeedAndPost(client, config),
    {
      timezone: config.timezone,
    }
  );

  task.start();

  console.log(
    `[${new Date().toISOString()}] ✅ Scheduler started - will check feed at noon and midnight (${config.timezone})`
  );

  // Initial sync on startup
  if (config.env === 'development') {
    // Development: post all new articles immediately
    console.log(`[${new Date().toISOString()}] Development mode - running full feed check...`);
    checkFeedAndPost(client, config).catch(error => {
      console.error(`[${new Date().toISOString()}] Initial feed check failed:`, error);
    });
  } else {
    // Production: post only the 2 most recent articles on first deployment
    console.log(`[${new Date().toISOString()}] Production mode - running initial sync (2 articles)...`);
    initialSync(client, config).catch(error => {
      console.error(`[${new Date().toISOString()}] Initial sync failed:`, error);
    });
  }
}
