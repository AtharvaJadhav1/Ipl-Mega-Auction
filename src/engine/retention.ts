import { CRORE } from "@/lib/money";

/** IPL 2025 mega-auction retention slabs: five capped slots and up to two uncapped slots. */
export const CAPPED_SLABS = [18 * CRORE, 14 * CRORE, 11 * CRORE, 18 * CRORE, 14 * CRORE];
export const UNCAPPED_SLAB = 4 * CRORE;
export const MAX_RETAINED = 6;
export const MAX_CAPPED_RETAINED = 5;
export const MAX_UNCAPPED_RETAINED = 2;

export type RetentionCandidate = { id: string; capped: boolean; isOverseas: boolean };

export type RetentionPlan = {
  /** Price charged for each pick, in the order given. */
  costs: number[];
  total: number;
  error: string | null;
};

/** Costs follow pick order: the n-th capped pick pays the n-th capped slab, uncapped picks pay the uncapped slab. */
export function planRetention(picks: RetentionCandidate[], opts: { maxOverseas: number }): RetentionPlan {
  const costs: number[] = [];
  let capped = 0;
  let uncapped = 0;
  let overseas = 0;
  let error: string | null = null;
  const seen = new Set<string>();
  for (const p of picks) {
    if (seen.has(p.id)) error ??= "A player was selected twice.";
    seen.add(p.id);
    if (p.isOverseas) overseas += 1;
    if (p.capped) {
      costs.push(CAPPED_SLABS[capped] ?? 0);
      capped += 1;
    } else {
      costs.push(UNCAPPED_SLAB);
      uncapped += 1;
    }
  }
  if (picks.length > MAX_RETAINED) error ??= `You can retain at most ${MAX_RETAINED} players.`;
  if (capped > MAX_CAPPED_RETAINED) error ??= `At most ${MAX_CAPPED_RETAINED} capped players can be retained.`;
  if (uncapped > MAX_UNCAPPED_RETAINED) error ??= `At most ${MAX_UNCAPPED_RETAINED} uncapped players can be retained.`;
  if (overseas > opts.maxOverseas) error ??= `Overseas limit (${opts.maxOverseas}) exceeded.`;
  return { costs, total: costs.reduce((a, b) => a + b, 0), error };
}

/** Cards left for the Right to Match: every retention slot not used becomes an RTM card. */
export function rtmCardsAfterRetention(retained: number) {
  return Math.max(0, MAX_RETAINED - retained);
}

const AI_TARGET: Record<string, number> = {
  conservative: 3,
  balanced: 4,
  "data-driven": 4,
  "bowling-focused": 4,
  aggressive: 4,
  "star-focused": 5,
};

/** AI teams keep their best-rated 2026 players that fit the slab rules. `ranked` must be best-first. */
export function aiRetentionPicks<T extends RetentionCandidate>(ranked: T[], personality: string, opts: { maxOverseas: number; purse: number }): T[] {
  const target = AI_TARGET[personality] ?? 4;
  const chosen: T[] = [];
  for (const p of ranked) {
    if (chosen.length >= target) break;
    const trial = planRetention([...chosen, p], opts);
    if (trial.error || trial.total > opts.purse * 0.6) continue;
    chosen.push(p);
  }
  return chosen;
}
