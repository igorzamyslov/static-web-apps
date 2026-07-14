// Persists which pages have been reviewed, tracked SEPARATELY for text and
// visual modes (reviewing the text diff doesn't mean the visual diff was
// checked, and vice versa). Keyed by the file pair.

export type ReviewMode = "text" | "visual";

export interface ReviewSets {
  text: Set<number>;
  visual: Set<number>;
}

const KEY_PREFIX = "pdf-diff:review:";

export function storageKey(
  oldName: string,
  oldSize: number,
  newName: string,
  newSize: number,
): string {
  return `${KEY_PREFIX}${oldName}:${String(oldSize)}|${newName}:${String(newSize)}`;
}

const toNumberSet = (value: unknown): Set<number> =>
  Array.isArray(value)
    ? new Set(value.filter((n): n is number => typeof n === "number"))
    : new Set();

export function loadReview(key: string): ReviewSets {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        return { text: toNumberSet(obj["text"]), visual: toNumberSet(obj["visual"]) };
      }
    }
  } catch (err) {
    console.error("Failed to load review state", err);
  }
  return { text: new Set(), visual: new Set() };
}

export function saveReview(key: string, sets: ReviewSets): void {
  try {
    localStorage.setItem(key, JSON.stringify({ text: [...sets.text], visual: [...sets.visual] }));
  } catch (err) {
    console.error("Failed to save review state", err);
  }
}
