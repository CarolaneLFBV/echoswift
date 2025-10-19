/**
 * Tests for Discord embeds
 */

import { test, expect, describe } from 'bun:test';
import { createArticleEmbed, createNotificationMessage } from '../src/discord/embeds';
import type { Article } from '../src/feed/parser';

describe('Discord Embeds', () => {
  test('should create valid embed with all fields', () => {
    const article: Article = {
      id: 'test-id',
      title: 'Test Article Title',
      link: 'https://swift.org/blog/test',
      description: 'This is a test article description.',
      publishedAt: new Date('2024-01-15T12:00:00Z'),
    };

    const embed = createArticleEmbed(article);
    const embedData = embed.toJSON();

    expect(embedData.title).toBe('Test Article Title');
    expect(embedData.url).toBe('https://swift.org/blog/test');
    expect(embedData.description).toBe('This is a test article description.');
    expect(embedData.color).toBe(0xF05138); // Swift orange
    expect(embedData.footer?.text).toContain('swift.org');
  });

  test('should truncate title if too long', () => {
    const longTitle = 'A'.repeat(300);
    const article: Article = {
      id: 'test-id',
      title: longTitle,
      link: 'https://swift.org/blog/test',
      description: 'Description',
      publishedAt: new Date(),
    };

    const embed = createArticleEmbed(article);
    const embedData = embed.toJSON();

    expect(embedData.title!.length).toBeLessThanOrEqual(256);
    expect(embedData.title).toEndWith('...');
  });

  test('should create notification message with role mention', () => {
    const roleId = '123456789';
    const message = createNotificationMessage(roleId);

    expect(message).toContain(`<@&${roleId}>`);
    expect(message).toContain('Nouvel article Swift.org');
  });

  test('should respect Discord description limit', () => {
    const longDescription = 'A'.repeat(5000);
    const article: Article = {
      id: 'test-id',
      title: 'Test',
      link: 'https://swift.org/blog/test',
      description: longDescription,
      publishedAt: new Date(),
    };

    const embed = createArticleEmbed(article);
    const embedData = embed.toJSON();

    // Discord limit is 4096 characters
    expect(embedData.description!.length).toBeLessThanOrEqual(4096);
  });
});
