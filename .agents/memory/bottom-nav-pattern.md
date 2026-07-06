---
name: Bottom nav section switching pattern
description: How Web/Talks sections are structured to preserve WebView state
---

## Pattern
- Web section: `flex: 1` in normal flow — always rendered, WebViews stay alive
- Talks section: `position: absolute, top/left/right/bottom: 0, zIndex: 10` — lazy mounted on first switch
- Hidden section uses `opacity: 0` (still rendered) + `pointerEvents: "none"` (no interaction)
- BottomNav pill floats at `position: absolute, bottom: 22, zIndex: 200`

## Key files
- `components/BottomNav.tsx` — animated sliding pill, expo-blur on iOS
- `components/TalksScreen.tsx` — full talks section with categories + feed + FAB + create modal
- `app/(tabs)/index.tsx` — manages `activeSection` state + lazy `showTalks` flag

**Why:** `display: 'none'` in React Native unmounts WebViews (losing scroll position). opacity:0 keeps them alive. Lazy mounting TalksScreen avoids loading talks data before user ever switches.
