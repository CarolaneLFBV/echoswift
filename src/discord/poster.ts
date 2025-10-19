/**
 * Discord message poster
 * Handles posting embeds to channels with rate limiting
 */

import { Client, TextChannel, ChannelType } from 'discord.js';
import { createArticleEmbed, createNotificationMessage } from './embeds.js';
import type { Article } from '../feed/parser.js';

/**
 * Post article to Discord channel
 */
export async function postArticle(
  client: Client,
  channelId: string,
  roleId: string,
  article: Article
): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Support both text and announcement channels
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      throw new Error(`Channel ${channelId} is not a text or announcement channel`);
    }

    const textChannel = channel as TextChannel;

    // Check bot permissions
    const permissions = textChannel.permissionsFor(client.user!);
    if (!permissions) {
      throw new Error(`Cannot determine permissions for channel ${channelId}`);
    }

    const requiredPermissions = ['SendMessages', 'EmbedLinks', 'MentionEveryone'] as const;
    for (const perm of requiredPermissions) {
      if (!permissions.has(perm)) {
        throw new Error(`Missing permission: ${perm}`);
      }
    }

    // Create embed and message
    const embed = createArticleEmbed(article);
    const content = createNotificationMessage(roleId);

    // Post message
    await textChannel.send({
      content,
      embeds: [embed],
      allowedMentions: {
        roles: [roleId],
      },
    });

    console.log(
      `[${new Date().toISOString()}] Posted article: ${article.title}`
    );

  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Failed to post article "${article.title}":`,
      error
    );
    throw error;
  }
}

/**
 * Post multiple articles with rate limiting
 * Discord rate limit: ~5 messages per 5 seconds per channel
 */
export async function postArticles(
  client: Client,
  channelId: string,
  roleId: string,
  articles: Article[]
): Promise<void> {
  if (articles.length === 0) {
    console.log(`[${new Date().toISOString()}] No articles to post`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Posting ${articles.length} articles...`);

  for (let i = 0; i < articles.length; i++) {
    try {
      await postArticle(client, channelId, roleId, articles[i]);

      // Rate limiting: wait 2 seconds between posts (safe buffer)
      if (i < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error posting article ${i + 1}/${articles.length}:`,
        error
      );
      // Continue with next article even if one fails
    }
  }

  console.log(`[${new Date().toISOString()}] Finished posting articles`);
}
