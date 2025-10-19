/**
 * JSON storage for tracking posted articles
 * Thread-safe writes with atomic operations
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

interface PostedArticle {
  id: string;
  postedAt: string; // ISO timestamp
}

const STORAGE_PATH = join(process.cwd(), 'data', 'posted-articles.json');
const BACKUP_PATH = join(process.cwd(), 'data', 'posted-articles.backup.json');

/**
 * Load posted articles from JSON file
 */
export async function loadPostedArticles(): Promise<Set<string>> {
  try {
    await ensureDataDirectory();

    if (!existsSync(STORAGE_PATH)) {
      console.log(`[${new Date().toISOString()}] No storage file found, creating new one`);
      await savePostedArticles(new Set());
      return new Set();
    }

    const content = await readFile(STORAGE_PATH, 'utf-8');
    const articles: PostedArticle[] = JSON.parse(content);

    // Cleanup old articles (>30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = articles.filter(article => {
      const postedAt = new Date(article.postedAt).getTime();
      return postedAt > thirtyDaysAgo;
    });

    if (filtered.length < articles.length) {
      console.log(
        `[${new Date().toISOString()}] Cleaned up ${articles.length - filtered.length} old articles`
      );
      // Save cleaned data
      const ids = new Set(filtered.map(a => a.id));
      await savePostedArticles(ids);
      return ids;
    }

    return new Set(articles.map(a => a.id));

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading storage:`, error);
    return new Set();
  }
}

/**
 * Save posted articles to JSON file with backup
 */
export async function savePostedArticles(articleIds: Set<string>): Promise<void> {
  try {
    await ensureDataDirectory();

    // Create backup of existing file
    if (existsSync(STORAGE_PATH)) {
      const content = await readFile(STORAGE_PATH, 'utf-8');
      await writeFile(BACKUP_PATH, content, 'utf-8');
    }

    const articles: PostedArticle[] = Array.from(articleIds).map(id => ({
      id,
      postedAt: new Date().toISOString(),
    }));

    // Atomic write: write to temp file, then rename
    const tempPath = `${STORAGE_PATH}.tmp`;
    await writeFile(tempPath, JSON.stringify(articles, null, 2), 'utf-8');
    await Bun.write(STORAGE_PATH, await Bun.file(tempPath).text());

    console.log(`[${new Date().toISOString()}] Saved ${articles.length} articles to storage`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving storage:`, error);
    throw error;
  }
}

/**
 * Add article ID to posted articles
 */
export async function markArticleAsPosted(articleId: string): Promise<void> {
  const posted = await loadPostedArticles();
  posted.add(articleId);
  await savePostedArticles(posted);
}

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory(): Promise<void> {
  const dataDir = dirname(STORAGE_PATH);
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}
