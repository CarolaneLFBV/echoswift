/**
 * HTTP fetcher with retry logic and exponential backoff
 */

interface FetchOptions {
  maxRetries?: number;
  timeout?: number;
}

/**
 * Fetch URL with retry and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const { maxRetries = 3, timeout = 10000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log(`[${new Date().toISOString()}] Successfully fetched feed (attempt ${attempt + 1})`);
      return text;

    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        const backoffMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(
          `[${new Date().toISOString()}] Fetch attempt ${attempt + 1} failed: ${lastError.message}. ` +
          `Retrying in ${backoffMs}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message}`
  );
}
