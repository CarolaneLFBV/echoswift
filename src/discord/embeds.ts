/**
 * Discord embed builder for Swift.org articles
 */

import { EmbedBuilder } from 'discord.js';
import type { Article } from '../feed/parser.js';

const SWIFT_ORANGE = 0xF05138;

/**
 * Create Discord embed for an article
 */
export function createArticleEmbed(article: Article): EmbedBuilder {
  // Ensure title doesn't exceed Discord's 256 char limit
  const title = article.title.length > 256
    ? article.title.substring(0, 253) + '...'
    : article.title;

  // Format date for footer
  const dateStr = article.publishedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setURL(article.link)
    .setDescription(article.description)
    .setColor(SWIFT_ORANGE)
    .setFooter({
      text: `swift.org • Published ${dateStr}`,
    })
    .setTimestamp(article.publishedAt);

  return embed;
}

/**
 * Create notification message content with role mention
 */
export function createNotificationMessage(roleId: string): string {
  return `<@&${roleId}> 📰 Nouvel article Swift.org !`;
}
