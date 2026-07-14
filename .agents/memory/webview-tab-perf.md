---
name: WebView tab switching performance
description: Patterns for fast, non-freezing tab switching with multiple mounted WebViews
---

## All-absolute WebView positioning
All WebViewPane instances use `StyleSheet.absoluteFillObject` for both visible and hidden states.
Only `opacity` changes on switch (1 → 0). Never change between `flex:1` and `position:absolute`.

**Why**: Changing position type triggers a full native layout pass on the JS bridge. An opacity-only
change is handled by the compositor with zero JS involvement.

**How to apply**: The `content` container in index.tsx has `flex:1; overflow:hidden`. All children are
position:absolute and naturally fill it. `hiddenView` style has `pointerEvents:"none"` to block touches.

## startTransition for tab press
Wrap `setActiveTabId(tab.id)` in `startTransition`. This lets React defer the state update as
non-urgent, so the press animation commits to screen first.

**Why**: Without it, the JS thread runs the full React reconciliation synchronously during the press,
blocking native animations and causing a visible "freeze".

## Stable FlatList renderItem + extraData
Pattern: keep `renderItem` stable (don't include `activeTabId` in useCallback deps). Use a mutable
`activeTabIdRef` that is always current. Pass `extraData={activeTabId}` to FlatList.

**Why**: Changing `renderItem` causes FlatList to re-render ALL visible items. With stable `renderItem`
and `extraData`, only items whose props actually changed (via memo comparison) re-render — typically just 2.

## URL persistence
- `setUrlForTab` debounce-writes to AsyncStorage (1.5s). Key: `republic_tab_urls`.
- Loaded into `savedUrlsRef` at startup (parallel with other storage reads).
- `getInitialUrlForTab(tabId, fallback)` in BrowserContext returns from ref — stable, no re-renders.
- `NativeWebView` captures `initialUrl ?? url` into a `useRef` once at mount. Subsequent prop changes
  to `url` do NOT cause a WebView reload (correct — canonical URL shouldn't interrupt user navigation).

## Login persistence
WKWebView (iOS) and Android WebView persist cookies natively across app restarts when:
- `sharedCookiesEnabled={true}` — shares WKWebView cookie store across all WebViews in the app
- `domStorageEnabled={true}` — persists localStorage
- `cacheEnabled={true}` — HTTP cache for faster page loads
No additional work needed for login persistence on websites.
