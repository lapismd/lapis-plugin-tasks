/**
 * Append one child immediately after its owning surface, replacing only the
 * previous descendant branch to that surface's right.
 */
export function appendDetailColumn<T>(
  stack: readonly T[],
  sourceIndex: number,
  entry: T,
): T[] {
  return [...stack.slice(0, Math.max(0, sourceIndex + 1)), entry];
}

/** Remove a detail column and every descendant while retaining its ancestors. */
export function unwindDetailColumns<T>(
  stack: readonly T[],
  columnIndex: number,
): T[] {
  return stack.slice(0, Math.max(0, columnIndex));
}
