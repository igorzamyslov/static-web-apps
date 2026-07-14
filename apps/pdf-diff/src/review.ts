// Persists which pages have been marked reviewed, keyed by the file pair, so
// reopening the same two PDFs restores review progress.

const KEY_PREFIX = "pdf-diff:review:";

export function storageKey(
  oldName: string,
  oldSize: number,
  newName: string,
  newSize: number,
): string {
  return `${KEY_PREFIX}${oldName}:${String(oldSize)}|${newName}:${String(newSize)}`;
}

export function loadReviewed(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((n): n is number => typeof n === "number"));
      }
    }
  } catch (err) {
    console.error("Failed to load review state", err);
  }
  return new Set();
}

export function saveReviewed(key: string, reviewed: Set<number>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...reviewed]));
  } catch (err) {
    console.error("Failed to save review state", err);
  }
}
