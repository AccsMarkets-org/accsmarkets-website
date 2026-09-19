// IndexNow — instantly notify Bing / Yandex / Seznam when URLs are added or
// updated, so new listings get discovered in minutes instead of waiting for a
// crawl. Key file is hosted at https://accsmarkets.org/<KEY>.txt (public/).
// Docs: https://www.indexnow.org/documentation

const HOST = "accsmarkets.org";
const KEY = "d34189baf42145869b1281396bed40b2eb5ad0dd83024ac1a48d64c8146fac42";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

export function listingUrl(id: string): string {
  return `https://${HOST}/listings/${id}`;
}

export function sellerUrl(username: string): string {
  return `https://${HOST}/seller/${username}`;
}

export function blogUrl(slug: string): string {
  return `https://${HOST}/blog/${slug}`;
}

/**
 * Submit one or more URLs to IndexNow. Fire-and-forget: never throws, never
 * blocks the caller. Silently no-ops on empty input. IndexNow accepts up to
 * 10,000 URLs per request.
 */
export async function submitToIndexNow(urls: string[]): Promise<void> {
  const list = urls.filter(Boolean).slice(0, 10000);
  if (list.length === 0) return;

  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: list,
      }),
      // Don't let a slow/hung IndexNow endpoint hold a request open.
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Best-effort only — search discovery must never affect app behaviour.
  }
}
