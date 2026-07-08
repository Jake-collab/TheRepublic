---
name: Blue-green theme
description: Color palette for Republic mobile app and admin dashboard
---
Mobile (constants/colors.ts):
- primary light: #2563eb, dark: #3b82f6 (blue)
- accent/green light: #16a34a, dark: #22c55e
- background light: #f0f6ff, dark: #070d1a
- Extra keys added: `green`, `greenForeground` (not in base scaffold)

Admin (index.css HSL):
- --primary: 217 91% 60% (blue-500 equivalent)
- --chart-2: 142 71% 45% (green accent)
- Sidebar: 220 30% 6% (near-black blue)

**Why:** User requested blue and green color scheme replacing the original gold.
**How to apply:** All color references go through useColors() hook on mobile; CSS variables on admin.
