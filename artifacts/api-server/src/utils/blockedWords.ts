import { db } from "@workspace/db";
import { blockedWordsTable } from "@workspace/db";

let cache: string[] = [];
let cacheTime = 0;
const TTL_MS = 60_000;

export async function getBlockedWords(): Promise<string[]> {
  if (Date.now() - cacheTime < TTL_MS) return cache;
  const rows = await db.select({ word: blockedWordsTable.word }).from(blockedWordsTable);
  cache = rows.map((r) => r.word.toLowerCase());
  cacheTime = Date.now();
  return cache;
}

export async function containsBlockedWord(text: string): Promise<string | null> {
  const words = await getBlockedWords();
  const lower = text.toLowerCase();
  for (const word of words) {
    if (lower.includes(word)) return word;
  }
  return null;
}

export function invalidateBlockedWordsCache(): void {
  cacheTime = 0;
}
