/**
 * Deterministic clarity check for a single hook line. No AI, no network.
 *
 * A hook is one or two sentences, so the usual document-level readability
 * indices are noisy here. We score a few concrete, explainable things: length,
 * long words, filler phrases, and hedging. Same input, same output.
 */

import type { ClarityNote } from "./types";
import { wordCount, sentenceCount, syllables } from "./text";

const FILLER = [
  "very",
  "really",
  "actually",
  "basically",
  "literally",
  "just",
  "quite",
  "kind of",
  "sort of",
  "in order to",
  "the fact that",
  "at the end of the day",
  "needless to say",
];

const HEDGES = ["maybe", "perhaps", "arguably", "somewhat", "i think", "i believe", "it seems"];

const JARGON = [
  "synergy",
  "leverage",
  "paradigm",
  "disrupt",
  "disruptive",
  "ecosystem",
  "bandwidth",
  "circle back",
  "move the needle",
  "low-hanging fruit",
  "best-in-class",
  "next-level",
  "game-changer",
  "game changer",
];

export interface ClarityResult {
  score: number; // 0-100
  grade: "clear" | "okay" | "dense";
  notes: ClarityNote[];
}

function countPhrases(haystack: string, needles: string[]): string[] {
  // Word-boundary match, tolerant of surrounding punctuation.
  const norm = ` ${haystack
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")} `;
  return needles.filter((n) => norm.includes(` ${n} `));
}

export function checkClarity(text: string): ClarityResult {
  const trimmed = text.trim();
  const words = wordCount(trimmed);
  const sentences = sentenceCount(trimmed);
  const wordList = trimmed.split(/\s+/).filter(Boolean);
  const longWords = wordList.filter((w) => syllables(w) >= 4).length;
  const longWordRatio = words ? longWords / words : 0;
  const perSentence = words / sentences;

  const filler = countPhrases(trimmed, FILLER);
  const hedges = countPhrases(trimmed, HEDGES);
  const jargon = countPhrases(trimmed, JARGON);

  let score = 100;
  const notes: ClarityNote[] = [];

  if (perSentence > 22) {
    score -= 22;
    notes.push({
      label: "Sentence length",
      status: "warn",
      detail: `About ${Math.round(perSentence)} words per sentence. Aim for under 20.`,
    });
  } else {
    notes.push({
      label: "Sentence length",
      status: "pass",
      detail: `About ${Math.round(perSentence)} words per sentence.`,
    });
  }

  if (longWordRatio > 0.25 && longWords >= 2) {
    score -= 18;
    notes.push({
      label: "Long words",
      status: "warn",
      detail: `${longWords} long words in ${words}. Shorter words read faster.`,
    });
  } else {
    notes.push({ label: "Long words", status: "pass", detail: `${longWords} of ${words}.` });
  }

  if (filler.length > 0) {
    score -= Math.min(20, filler.length * 8);
    notes.push({
      label: "Filler",
      status: "warn",
      detail: `Cut: ${filler.join(", ")}.`,
    });
  } else {
    notes.push({ label: "Filler", status: "pass", detail: "None." });
  }

  if (hedges.length > 0) {
    score -= Math.min(15, hedges.length * 8);
    notes.push({
      label: "Hedging",
      status: "warn",
      detail: `Reads tentative: ${hedges.join(", ")}.`,
    });
  }

  if (jargon.length > 0) {
    score -= Math.min(20, jargon.length * 10);
    notes.push({
      label: "Jargon",
      status: "warn",
      detail: `Business-speak: ${jargon.join(", ")}.`,
    });
  } else {
    notes.push({ label: "Jargon", status: "pass", detail: "None." });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 80 ? "clear" : score >= 55 ? "okay" : "dense";
  return { score, grade, notes };
}
