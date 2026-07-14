---
name: BottomNav full-width docked design
description: The new BottomNav is full-width, docked to screen bottom, with a collapsible handle zone
---

## Layout
- Total: HANDLE_H(16) + TABS_H(34) + insets.bottom
- Wrapper: position absolute, bottom 0, left 0, right 0 — NO border radius
- iOS: BlurView intensity 80 tint dark; Android: rgba(8,8,8,0.86)
- Top center: 30×3 pill handle + chevron icon

## Collapse animation
- `collapseAnim` is a raw Animated.Value used directly as translateY (no interpolate)
- At toggle time: compute `toValue = next ? TABS_H + insetsRef.current.bottom : 0`
- Using a ref (insetsRef) to capture current insets at toggle time avoids stale closure

**Why:** Animated.interpolate bakes the outputRange at creation time. Since insets.bottom is known and constant per device session, we can compute it imperatively at toggle time and avoid the interpolate entirely.

## FAB clearance
- CitizenVoteFeed FAB: bottom 70
- TalksScreen FAB: bottom 96, list paddingBottom 104
