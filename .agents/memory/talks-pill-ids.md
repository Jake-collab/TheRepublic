---
name: TalksScreen pill IDs
description: Magic IDs for the category pill bar in TalksScreen
---
- CHAT_ALL_ID = -2 → all-posts mode (selectedCatId = null). CHAT_PILL is first pill.
- CITIZEN_VOTE_ID = -1 → Citizen Vote feed mode. CV_PILL is second pill.
- Positive integer → specific discussion category filter.
- null selectedCatId = isAllMode = "Chat" mode (default on mount).
- tapping Chat pill always → null; CV toggles null↔-1; category toggles null↔id.
**Why:** Needed negative sentinel IDs to distinguish synthetic pills from DB category IDs.
