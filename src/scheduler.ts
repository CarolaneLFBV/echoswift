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
async function checkFeedAndPost(client: Client, config: Config): Promise<void> {
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
    const newArticles = articles.filter(article => !postedIds.has(article.id));

    if (newArticles.length === 0) {
      console.log(`[${new Date().toISOString()}] No new articles to post`);
      return;
    }

    console.log(
      `[${new Date().toISOString()}] Found ${newArticles.length} new articles (${articles.length} total in feed)`
    );

    // Sort by date (oldest first)
    newArticles.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());

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

  // Run once immediately on startup (optional - useful for testing)
  if (config.env === 'development') {
    console.log(`[${new Date().toISOString()}] Development mode - running initial feed check...`);
    checkFeedAndPost(client, config).catch(error => {
      console.error(`[${new Date().toISOString()}] Initial feed check failed:`, error);
    });
  }
}
