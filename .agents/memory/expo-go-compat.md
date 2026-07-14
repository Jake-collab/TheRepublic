---
name: Expo Go incompatible modules
description: Native modules that crash in Expo Go SDK 54 and the safe patterns to handle them
---

## react-native-keyboard-controller (v1.18.5)
No Expo Go interop directory. `<KeyboardProvider>` throws at render time when native module is not registered.

**Pattern**: Wrap in a class-based ErrorBoundary (`KeyboardProviderBoundary` in `_layout.tsx`) that catches the crash and falls back to rendering children directly. The keyboard controller works fine in dev/prod builds; only degrades in Expo Go.

**Why**: The crash happens at render time, not import time — so try/catch on `require()` at module level does NOT help. Only a React ErrorBoundary (class component) can catch render errors.

**How to apply**: Any native module without Expo Go interop that you want to keep in the codebase — wrap its usage in a class-based ErrorBoundary with a fallback render that omits it.

## react-native-webview
Not in Expo Go SDK 54 managed workflow. Handled in `WebViewPane.tsx` with `try { require("react-native-webview") } catch` — shows "WebView requires a development build" fallback. This is intentional.

## Web iframe (X-Frame-Options)
Most major sites block iframe embedding. The sandbox attribute was also too restrictive. Fixed by removing sandbox and adding a timed "Open site ↗" bar after 4s.
