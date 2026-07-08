---
name: Orval query options format
description: How to pass options to Orval-generated React Query hooks in this project
---

## Correct pattern
```tsx
// Params as first arg, no second arg for options
const { data } = useListTalkPosts({ categoryId: 1, sort: 'new', limit: 25 });
```

## What DOESN'T work
```tsx
// WRONG — React Query v5 UseQueryOptions requires queryKey, Partial not used
useListTalkCategories({ query: { staleTime: 5 * 60 * 1000 } })
useListTalkPosts(params, { query: { enabled: false } })
// Error: Type '{ staleTime: number }' is not assignable to UseQueryOptions — queryKey missing
```

## For conditional enabling
Use the `enabled` param pattern from QueryClient defaults, or gate the component's render instead of disabling the query.

## For reacting to data
Use `useEffect` watching the `data` value — `onSuccess` callback was removed in React Query v5.

**Why:** Orval generates hooks that pass `UseQueryOptions` (not `Partial<UseQueryOptions>`) as the inner type in this project's configuration, so `queryKey` is always required if you try to pass query options.
