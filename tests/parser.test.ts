/**
 * Tests for feed parser
 */

import { test, expect, describe } from 'bun:test';
import { parseFeed } from '../src/feed/parser';

describe('Feed Parser', () => {
  test('should parse valid Atom feed', async () => {
    const mockAtomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Swift.org Blog</title>
  <link href="https://www.swift.org/blog/"/>
  <updated>2024-01-15T12:00:00Z</updated>
  <entry>
    <id>https://www.swift.org/blog/article-1</id>
    <title>Test Article 1</title>
    <link href="https://www.swift.org/blog/article-1"/>
    <updated>2024-01-15T12:00:00Z</updated>
    <summary>This is a test article summary.</summary>
  </entry>
  <entry>
    <id>https://www.swift.org/blog/article-2</id>
    <title>Test Article 2</title>
    <link href="https://www.swift.org/blog/article-2"/>
    <updated>2024-01-14T10:00:00Z</updated>
    <summary>Another test article.</summary>
  </entry>
</feed>`;

    const articles = await parseFeed(mockAtomXml);

    expect(articles).toHaveLength(2);
    expect(articles[0].id).toBe('https://www.swift.org/blog/article-1');
    expect(articles[0].title).toBe('Test Article 1');
    expect(articles[0].link).toBe('https://www.swift.org/blog/article-1');
    expect(articles[0].description).toBe('This is a test article summary.');
  });

  test('should handle empty feed', async () => {
    const emptyFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Swift.org Blog</title>
  <link href="https://www.swift.org/blog/"/>
</feed>`;

    const articles = await parseFeed(emptyFeed);
    expect(articles).toHaveLength(0);
  });

  test('should truncate long descriptions', async () => {
    const longDescription = 'A'.repeat(5000);
    const feedWithLongDesc = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>test-id</id>
    <title>Test</title>
    <link href="https://example.com"/>
    <updated>2024-01-15T12:00:00Z</updated>
    <summary>${longDescription}</summary>
  </entry>
</feed>`;

    const articles = await parseFeed(feedWithLongDesc);
    expect(articles[0].description.length).toBeLessThanOrEqual(4000);
    expect(articles[0].description).toEndWith('...');
  });
});
