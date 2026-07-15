// Module-level registry: tabId → callback to start loading that tab's WebView.
// Written to by WebViewPane on mount; read by WebsiteTabBar on onPressIn.
// Uses a plain Map — zero React overhead, zero re-renders.

const registry = new Map<string, () => void>();
const urlRegistry = new Map<string, string>(); // tabId → origin URL
const prewarmCache = new Set<string>(); // origins already prewarmed this session

export function registerTabPreload(tabId: string, fn: () => void): void {
  registry.set(tabId, fn);
}

export function unregisterTabPreload(tabId: string): void {
  registry.delete(tabId);
  urlRegistry.delete(tabId);
}

export function registerTabUrl(tabId: string, url: string): void {
  urlRegistry.set(tabId, url);
}

export function triggerTabPreload(tabId: string): void {
  registry.get(tabId)?.();
}

/**
 * Fire a zero-byte HEAD request to the site's origin to prime DNS resolution
 * and TCP/TLS handshake before the WebView loads. Runs once per origin per
 * session (cached in prewarmCache) and is completely fire-and-forget.
 */
export function prewarmConnection(tabId: string): void {
  const url = urlRegistry.get(tabId);
  if (!url) return;
  try {
    const { origin } = new URL(url);
    if (prewarmCache.has(origin)) return;
    prewarmCache.add(origin);
    fetch(origin, {
      method: "HEAD",
      // @ts-ignore — mode not typed in RN fetch but valid for native
      mode: "no-cors",
      cache: "no-store",
    }).catch(() => {});
  } catch {}
}
