---
name: React Compiler breaks useFonts in Expo SDK 54
description: React Compiler (enabled by default in Expo SDK 54) incorrectly transforms @expo-google-fonts/inter's useFonts hook, causing a null-React crash at startup on web.
---

## The rule
Always set `"reactCompiler": false` in `app.json` experiments for this project.

**Why:** Expo SDK 54 enables React Compiler by default (`experiments.reactCompiler: true`). The compiler incorrectly hoists or transforms `useFonts` from `@expo-google-fonts/inter`, calling its internal `useState` outside the React tree. The symptom is `TypeError: Cannot read properties of null (reading 'useState')` in `app/_layout.tsx` at the `useFonts` call — the error overlay shows "Log 2 of 2" and "Invalid hook call" warnings.

**How to apply:**
In `artifacts/the-republic/app.json`:
```json
"experiments": {
  "typedRoutes": true,
  "reactCompiler": false
}
```
Also add `--clear` to the expo start command once to flush Metro's bundle cache when switching this setting. After the fix, remove `--clear` to restore normal startup speed.
