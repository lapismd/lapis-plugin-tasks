import type { Snippet } from "svelte";

/** Recast snippets across the linked Design Core svelte type identity. */
export function asSnippet<Args extends unknown[] = []>(
  snippet: unknown,
): Snippet<Args> {
  return snippet as Snippet<Args>;
}
