/**
 * Same extraction rules as `public/sw.js` `assetUrlsFromHtml` — kept here for unit tests.
 * SW cannot import this module; update both if the pattern changes.
 */
export function assetUrlsFromHtml(html: string, origin: string): string[] {
  const urls = new Set<string>();
  const pattern =
    /(?:href|src)=["'](\/assets\/[^"']+)["']|["'](https?:\/\/[^"']+\/assets\/[^"']+)["']/gi;
  let match = pattern.exec(html);
  while (match) {
    const raw = match[1] || match[2];
    if (!raw) {
      match = pattern.exec(html);
      continue;
    }
    try {
      const url = new URL(raw, origin);
      if (url.origin === origin && url.pathname.startsWith("/assets/")) {
        urls.add(url.pathname + url.search);
      }
    } catch {
      // ignore
    }
    match = pattern.exec(html);
  }
  return [...urls];
}
