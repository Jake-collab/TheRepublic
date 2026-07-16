---
name: Skeleton screen pattern
description: How skeleton loading states are implemented across the mobile screens
---
**Rule:** Each screen defines its own skeleton component(s) inline — no shared lib. All use `Animated.loop(Animated.sequence([timing 0.3→0.85, timing 0.85→0.3], 850ms))` with `useNativeDriver: true` for 60fps.

Components:
- BuySellScreen → `SkeletonCard` (card with image area + 3 text lines) + `SkeletonGrid` (6 cards, 2-column)
- GigsScreen → `SkeletonRow` (icon + 3 lines + badge) + `SkeletonList` (count prop)
- FreelanceScreen → `SkeletonRow` (same shape, different widths) + `SkeletonList`
- WebsiteTabBar → `SkeletonPills` (6 static ghost pills, no animation — fast enough)

**Why:** `ActivityIndicator` + blank list looks broken. Skeletons preserve layout shape and signal "loading" rather than "empty".

**How to apply:** Use in FlatList `ListEmptyComponent` when `isLoading && items.length === 0`. Keep animation loop cleanup in useEffect return (`loop.stop()`). Use `backgroundColor: "#8882"` (8-char hex with alpha) for the muted gray that works in both light/dark mode.
