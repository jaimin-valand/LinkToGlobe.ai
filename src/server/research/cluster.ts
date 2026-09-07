/**
 * Deterministic story clustering.
 *
 * This is a first version and it is exactly what it looks like: it groups
 * sources whose titles share enough distinctive words, nudged by same-publisher
 * and same-week signals. It does not "understand" the story. Output is stable
 * for the same input.
 */

export interface ClusterInput {
  /** Stable id for the source (index or db id). */
  id: string;
  title: string;
  host?: string;
  publishedAt?: Date;
}

export interface Cluster {
  /** Ids of the member sources, in input order. */
  memberIds: string[];
  /** Representative (longest, most informative) title. */
  title: string;
}

const STOPWORDS = new Set(
  "the a an and or but of to in on for with at by from as is are was were be been being this that these those it its into over after before how why what when who will would can could should new says say said according amid".split(
    " ",
  ),
);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function withinDays(a?: Date, b?: Date, days = 4): boolean {
  if (!a || !b) return false;
  return Math.abs(a.getTime() - b.getTime()) <= days * 86_400_000;
}

/** Similarity in 0..1 between two sources. Exported for testing. */
export function sourceSimilarity(x: ClusterInput, y: ClusterInput): number {
  const base = jaccard(titleTokens(x.title), titleTokens(y.title));
  let score = base;
  if (x.host && x.host === y.host) score += 0.1;
  if (withinDays(x.publishedAt, y.publishedAt)) score += 0.1;
  return Math.min(1, score);
}

const CLUSTER_THRESHOLD = 0.34;

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
}

export function clusterSources(sources: ClusterInput[]): Cluster[] {
  const n = sources.length;
  const uf = new UnionFind(n);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sourceSimilarity(sources[i], sources[j]) >= CLUSTER_THRESHOLD) {
        uf.union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    (groups.get(root) ?? groups.set(root, []).get(root)!).push(i);
  }

  return [...groups.values()]
    .sort((a, b) => a[0] - b[0])
    .map((idxs) => {
      const members = idxs.map((i) => sources[i]);
      const representative = members
        .slice()
        .sort(
          (a, b) =>
            titleTokens(b.title).size - titleTokens(a.title).size || a.id.localeCompare(b.id),
        )[0];
      return {
        memberIds: idxs.map((i) => sources[i].id),
        title: representative.title,
      };
    });
}
