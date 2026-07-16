---
name: Admin direct-fetch pattern
description: New admin-only routes bypass OpenAPI codegen — use useAuth+fetch directly
---
Admin pages that add routes NOT in the OpenAPI spec use this pattern:

```tsx
const { getToken } = useAuth();
async function authFetch(url, opts) {
  const token = await getToken();
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
}
useQuery({ queryKey: [...], queryFn: async () => { const res = await authFetch(...); return res.json(); } });
```

**Why:** OpenAPI codegen is for the mobile + admin shared contract. Admin-internal routes (gigs, marketplace, diagnostics, etc.) don't need mobile exposure, so adding them to openapi.yaml just bloats the spec.

**How to apply:** Any future admin-only endpoint → add to admin.ts, use direct fetch in the admin page, skip codegen. If the route should also be available to mobile, add it to openapi.yaml and run codegen.
