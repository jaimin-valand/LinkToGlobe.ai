import "server-only";

export {
  generateCandidates,
  addManualCandidate,
  deleteCandidate,
  selectCandidate,
  clearSelection,
  getLabView,
  listLabs,
  HookLabError,
} from "./service";
export type { HookCandidateView, HookLabView, HookLabSummary } from "./service";
export { HOOK_STRATEGIES, strategyDef } from "./strategies";
export type { ClarityNote, HookWarning } from "./types";
