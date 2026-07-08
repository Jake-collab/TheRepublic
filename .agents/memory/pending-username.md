---
name: Pending username pattern for sign-up
description: How username set during sign-up is applied after auth completes
---

## Pattern
1. Sign-up screen stores username in `AsyncStorage("pending_username")` before calling `signUp.finalize()`
2. Main screen (`app/(tabs)/index.tsx`) checks for this key in a `useEffect([], [])` on mount
3. If found, calls `updateProfile.mutate({ data: { displayName: username } })` then removes the key

## Why this approach
Clerk's `signUp.finalize({ navigate })` takes over navigation immediately — there's no clean hook point after it to call our API before the main screen renders. Storing in AsyncStorage bridges the gap between the auth flow and the first authenticated API call.

**Why:** Can't intercept between Clerk finalize and first app render; AsyncStorage is synchronous-ish and survives the navigation.
