export type TaggedImage = { file: string; tags: string[] };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// A tag "relates" to a typed word if they match exactly, or one contains
// the other — so "beach" matches "beaches", and "office" matches
// "offices", without needing real language understanding.
function tagMatchesWord(tag: string, word: string): boolean {
  if (tag === word) return true;
  if (tag.length > 2 && word.includes(tag)) return true;
  if (word.length > 2 && tag.includes(word)) return true;
  return false;
}

function scoreImage(tags: string[], words: string[]): number {
  let score = 0;
  for (const tag of tags) {
    for (const word of words) {
      if (tagMatchesWord(tag, word)) score += tag === word ? 2 : 1;
    }
  }
  return score;
}

/**
 * Picks `count` images from `pool`, preferring ones whose tags relate to
 * `query`. Images that tie on score are shuffled amongst themselves so
 * results still vary between generations. If nothing in the pool has any
 * tag relating to `query` (including when `query` is empty, or when
 * images simply aren't tagged), this falls back to a plain random pick
 * so the feature still works without any tagging at all.
 */
export function pickRelevantImages(pool: TaggedImage[], count: number, query: string): string[] {
  if (pool.length === 0) return [];

  const words = tokenize(query);
  if (words.length === 0) {
    return shuffle(pool)
      .slice(0, count)
      .map((p) => p.file);
  }

  const scored = pool.map((p) => ({ file: p.file, score: scoreImage(p.tags, words) }));
  const topScore = Math.max(...scored.map((s) => s.score));

  if (topScore === 0) {
    return shuffle(pool)
      .slice(0, count)
      .map((p) => p.file);
  }

  const scoresDesc = [...new Set(scored.map((s) => s.score))].sort((a, b) => b - a);
  const result: string[] = [];
  for (const score of scoresDesc) {
    if (result.length >= count) break;
    const group = shuffle(scored.filter((s) => s.score === score).map((s) => s.file));
    result.push(...group);
  }
  return result.slice(0, count);
}