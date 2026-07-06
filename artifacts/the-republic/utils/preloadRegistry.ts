// Module-level registry: tabId → callback to start loading that tab's WebView.
// Written to by WebViewPane on mount; read by WebsiteTabBar on onPressIn.
// Uses a plain Map — zero React overhead, zero re-renders.

const registry = new Map<string, () => void>();

export function registerTabPreload(tabId: string, fn: () => void): void {
  registry.set(tabId, fn);
}

export function unregisterTabPreload(tabId: string): void {
  registry.delete(tabId);
}

export function triggerTabPreload(tabId: string): void {
  registry.get(tabId)?.();
}
