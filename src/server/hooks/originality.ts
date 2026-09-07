/**
 * How different each candidate is from the others in the same lab. Deterministic
 * pairwise token overlap. Used to stop the list filling up with near-copies.
 */

import { tokenSet, jaccard } from "./text";

export interface Distinctness {
  /** 0-100: 100 = shares nothing with any sibling. */
  distinctScore: number;
  /** Index of the most similar sibling, or null when it stands alone. */
  nearestIndex: number | null;
  /** True when a sibling is close enough to be a near-duplicate. */
  nearDuplicate: boolean;
}

const NEAR_DUPLICATE = 0.6;

/** Score every candidate against the rest of the set. Order matches the input. */
export function scoreDistinctness(texts: string[]): Distinctness[] {
  const sets = texts.map((t) => tokenSet(t));
  return sets.map((set, i) => {
    let best = 0;
    let nearestIndex: number | null = null;
    for (let j = 0; j < sets.length; j++) {
      if (j === i) continue;
      const sim = jaccard(set, sets[j]);
      if (sim > best) {
        best = sim;
        nearestIndex = j;
      }
    }
    return {
      distinctScore: Math.round((1 - best) * 100),
      nearestIndex: sets.length > 1 ? nearestIndex : null,
      nearDuplicate: best >= NEAR_DUPLICATE,
    };
  });
}
