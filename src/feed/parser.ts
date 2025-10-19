/**
 * Atom/RSS feed parser
 * Parses Swift.org Atom feed and extracts article metadata
 */

import Parser from 'rss-parser';

export interface Article {
  id: string;
  title: string;
  link: string;
  description: string;
  publishedAt: Date;
}

const parser = new Parser({
  customFields: {
    item: [
      ['id', 'id'],
      ['summary', 'summary'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

/**
 * Parse Atom feed XML and extract articles
 */
export async function parseFeed(xml: string): Promise<Article[]> {
  try {
    const feed = await parser.parseString(xml);

    if (!feed.items || feed.items.length === 0) {
      console.warn(`[${new Date().toISOString()}] Feed contains no items`);
      return [];
    }

    const articles: Article[] = feed.items.map((item) => {
      // Extract article ID (use guid or link as fallback)
      const id = item.id || item.guid || item.link || '';

      // Extract description (try multiple fields)
      const description =
        item.contentSnippet ||
        item.summary ||
        item.contentEncoded ||
        item.content ||
        item.description ||
        '';

      // Parse date
      const publishedAt = item.pubDate
        ? new Date(item.pubDate)
        : new Date();

      return {
        id,
        title: item.title || 'Untitled',
        link: item.link || '',
        description: truncateDescription(description),
        publishedAt,
      };
    });

    console.log(`[${new Date().toISOString()}] Parsed ${articles.length} articles from feed`);
    return articles;

  } catch (error) {
    throw new Error(`Failed to parse feed: ${(error as Error).message}`);
  }
}

/**
 * Truncate description to Discord embed limits (4096 chars)
 * Keep some margin for formatting
 */
function truncateDescription(text: string): string {
  const maxLength = 4000;

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}
