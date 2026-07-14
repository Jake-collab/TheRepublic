---
name: Expo Go on Replit — tunnel mode required
description: Why --localhost fails for Expo Go on Replit and the --tunnel fix
---

## Root cause
Replit's reverse proxy for Expo apps only exposes HTTPS (port 443). It refuses all connections on port 80.

Expo Go scans a `exp://HOST` QR code and tries to connect via `http://HOST:80/` — which Replit refuses with connection refused. Result: "could not connect to development server".

**Verified**: `curl http://$REPLIT_EXPO_DEV_DOMAIN/ → Connection refused`  
**Verified**: `curl https://$REPLIT_EXPO_DEV_DOMAIN/ → HTTP 200`

## Why EXPO_PACKAGER_PROXY_URL doesn't fix it
In `@expo/cli`, `getNativeRuntimeUrl()` hardcodes `scheme: 'exp'` for non-devClient connections (line 280 of BundlerDevServer.js). The protocol-upgrade in `getUrlComponentsFromProxyUrl` only fires when `protocol === 'http'` — but `'exp' !== 'http'`, so the upgrade is skipped. Result: QR code always uses `exp://` regardless of proxy URL scheme.

## The fix
Use `--tunnel` mode (`@expo/ngrok-bin@2.3.42`, no auth required — ngrok v2 binary).

Updated dev script (package.json):
```
pnpm exec expo start --tunnel --port $PORT
```

Remove from dev script:
- `EXPO_PACKAGER_PROXY_URL` — not needed, interfered with URL generation
- `REACT_NATIVE_PACKAGER_HOSTNAME` — not needed with tunnel

Keep:
- `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN` — app uses this for API base URL
- `EXPO_PUBLIC_REPL_ID=$REPL_ID`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY`
- `--port $PORT` — keeps Metro on 21779 so Replit web preview still works

## Behavior after fix
- `exp://aw3djwc-anonymous-21779.exp.direct` — ngrok URL (changes each restart)
- Expo Go: scans QR → tries http://HOST:80 → ngrok infrastructure → localhost:21779 → works ✓
- Web preview: Replit proxy → localhost:21779 → works ✓
- User must rescan QR code after each workflow restart (ngrok URL rotates)

## How to apply
Always use `--tunnel` for the Expo dev script on Replit. Do not revert to `--localhost`.
