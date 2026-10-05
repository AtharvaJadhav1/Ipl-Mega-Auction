import { PLAYER_SEEDS } from "@/data/players";
import { RIVALRIES } from "@/data/franchises";

export type FranchiseGaps = {
  /** 0..1 shortfall per role against a balanced squad, from the franchise's real 2026 squad. */
  role: Record<string, number>;
  pace: number;
  spin: number;
};

const ROLE_TARGET: Record<string, number> = { BATTER: 7, BOWLER: 8, ALL_ROUNDER: 5, WICKETKEEPER: 3 };
const PACE_TARGET = 5;
const SPIN_TARGET = 3;

export function bowlingKind(style: string | null): "pace" | "spin" | null {
  if (!style) return null;
  if (/Fast|Medium/i.test(style)) return "pace";
  if (/Spin|Break|Orthodox|Mystery/i.test(style)) return "spin";
  return null;
}

const cache = new Map<string, FranchiseGaps>();

/** What each franchise genuinely lacks, derived from the 2026 squad listed in the player data. */
export function franchiseGaps(franchiseId: string): FranchiseGaps {
  const hit = cache.get(franchiseId);
  if (hit) return hit;
  const squad = PLAYER_SEEDS.filter((p) => p.actual2026TeamId === franchiseId);
  const role: Record<string, number> = {};
  for (const [r, target] of Object.entries(ROLE_TARGET)) {
    const n = squad.filter((p) => p.role === r).length;
    role[r] = Math.max(0, target - n) / target;
  }
  const bowlers = squad.filter((p) => p.role === "BOWLER" || p.role === "ALL_ROUNDER");
  const pace = bowlers.filter((p) => bowlingKind(p.bowlingStyle) === "pace").length;
  const spin = bowlers.filter((p) => bowlingKind(p.bowlingStyle) === "spin").length;
  const gaps = {
    role,
    pace: Math.max(0, PACE_TARGET - pace) / PACE_TARGET,
    spin: Math.max(0, SPIN_TARGET - spin) / SPIN_TARGET,
  };
  cache.set(franchiseId, gaps);
  return gaps;
}

export function areRivals(a: string, b: string) {
  return RIVALRIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
