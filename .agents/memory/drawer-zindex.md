---
name: DrawerNav z-index + section pointerEvents
description: How to keep DrawerNav above all sections and prevent touch bleed-through
---
**Rule:** DrawerNav root View must have explicit zIndex:100 or it renders below absoluteFill sections that have zIndex:1.

Section Views must have pointerEvents="none" when hidden, not just opacity:0. Opacity alone does NOT stop touch events on React Native for Android/Web.

```tsx
// DrawerNav.tsx
<View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents={isOpen ? "auto" : "none"}>

// index.tsx sections
<View
  style={[styles.section, activeSection !== "talks" && styles.sectionHidden]}
  pointerEvents={activeSection !== "talks" ? "none" : "auto"}
>
```

**Why:** Discovered when drawer opened but tapping nav items did nothing — hidden sections were intercepting touches because they had zIndex:0 but no pointerEvents:"none".
