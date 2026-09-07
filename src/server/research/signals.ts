import { titleTokens } from "./cluster";
import type { EvidenceKind, SignalKind } from "@/generated/prisma";

/**
 * Deterministic signal extraction.
 *
 * A signal is an observation about the *coverage*, not a new fact. Every signal
 * carries the ids of the sources it is based on. Where the observation is our
 * own inference across several sources (rather than something one source
 * states), it is marked INFERENCE.
 */

export interface SignalSourceView {
  id: string;
  title: string;
  excerpt: string;
  publisher?: string;
  host: string;
  publishedAt?: Date;
}

export interface ClusterView {
  /** cluster id or a stable local key */
  key: string;
  title: string;
  sourceIds: string[];
}

export interface SignalDraft {
  kind: SignalKind;
  evidenceKind: EvidenceKind;
  clusterKey: string | null;
  summary: string;
  detail: string;
  sourceIds: string[];
}

const RECENT_DAYS = 4;

function newestDate(sources: SignalSourceView[]): Date | undefined {
  const dates = sources.map((s) => s.publishedAt).filter((d): d is Date => !!d);
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : undefined;
}

export function extractSignals(
  query: string,
  clusters: ClusterView[],
  sourcesById: Map<string, SignalSourceView>,
  topics: string[],
  now: Date = new Date(),
): SignalDraft[] {
  const out: SignalDraft[] = [];

  for (const cluster of clusters) {
    const members = cluster.sourceIds
      .map((id) => sourcesById.get(id))
      .filter((s): s is SignalSourceView => !!s);
    if (members.length === 0) continue;

    const size = members.length;
    const publishers = [...new Set(members.map((m) => m.publisher || m.host).filter(Boolean))];
    const newest = newestDate(members);
    const isRecent = !!newest && now.getTime() - newest.getTime() <= RECENT_DAYS * 86_400_000;

    if (size >= 3) {
      out.push({
        kind: "RISING",
        evidenceKind: "DIRECT",
        clusterKey: cluster.key,
        summary: `${size} sources are covering "${cluster.title}".`,
        detail: `Publishers: ${publishers.slice(0, 5).join(", ")}.${
          isRecent ? " Most of this coverage is recent." : ""
        }`,
        sourceIds: cluster.sourceIds,
      });
    } else if (size === 2) {
      out.push({
        kind: "RECURRING",
        evidenceKind: "INFERENCE",
        clusterKey: cluster.key,
        summary: `Two sources make a similar point about "${cluster.title}".`,
        detail: `Inferred from overlapping headlines across ${publishers.join(" and ")}. Neither source states this as a trend.`,
        sourceIds: cluster.sourceIds,
      });
    } else {
      const one = members[0];
      out.push({
        kind: "CHANGE",
        evidenceKind: "DIRECT",
        clusterKey: cluster.key,
        summary: `${one.publisher || one.host} reports: "${one.title}".`,
        detail: isRecent
          ? "Recently published and not yet widely picked up in this result set."
          : "A single source in this result set.",
        sourceIds: cluster.sourceIds,
      });
    }

    // Outlier: a lone source, but only when there is other coverage in the run
    // to be an outlier against. Skipped for single-cluster runs to avoid noise.
    if (size === 1 && clusters.length > 2) {
      out.push({
        kind: "UNUSUAL",
        evidenceKind: "INFERENCE",
        clusterKey: cluster.key,
        summary: `Only ${members[0].publisher || members[0].host} covers "${cluster.title}".`,
        detail:
          "Inferred: no other source in this run covers this story, while others cluster around a shared topic.",
        sourceIds: cluster.sourceIds,
      });
    }
  }

  // Run-level gap: topic words the user cares about that no cluster touches.
  if (clusters.length > 0 && topics.length > 0) {
    const covered = new Set<string>();
    for (const c of clusters) for (const t of titleTokens(c.title)) covered.add(t);
    for (const s of sourcesById.values())
      for (const t of titleTokens(`${s.title} ${s.excerpt}`)) covered.add(t);

    const wanted = titleTokens(topics.join(" "));
    const missing = [...wanted].filter((w) => !covered.has(w)).sort();
    if (missing.length > 0) {
      out.push({
        kind: "GAP",
        evidenceKind: "INFERENCE",
        clusterKey: null,
        summary: `The current coverage doesn't touch: ${missing.slice(0, 5).join(", ")}.`,
        detail: `Inferred by comparing your topics against every title and excerpt in this run for "${query}". This is a gap you could write into, not a claim about the world.`,
        sourceIds: [],
      });
    }
  }

  return out;
}
