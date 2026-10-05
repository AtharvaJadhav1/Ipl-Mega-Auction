export type GameRatings = {
  overall: number;
  batting: number;
  bowling: number;
  powerHitting: number;
  consistency: number;
  deathBowling: number;
  powerplayBowling: number;
  spin: number;
  fielding: number;
  experience: number;
  recentForm: number;
  label: "GAME RATING";
};

function clamp(n: number) {
  return Math.max(40, Math.min(99, Math.round(n)));
}

export function gameRatings(player: {
  id?: string;
  role: string;
  capped: boolean;
  isOverseas: boolean;
  runs: number | null;
  strikeRate: number | null;
  battingAvg: number | null;
  sixes: number | null;
  wickets: number | null;
  economy: number | null;
  bowlingAvg: number | null;
  actual2026Price: number | null;
  megaBasePrice: number;
  age: number | null;
  bowlingStyle: string | null;
}): GameRatings {
  if (player.id === undefined) return computeRatings(player);
  const key = `${player.id}|${player.runs}|${player.wickets}|${player.strikeRate}|${player.economy}|${player.actual2026Price}|${player.megaBasePrice}|${player.age}|${player.role}|${player.capped}|${player.sixes}|${player.battingAvg}|${player.bowlingAvg}|${player.bowlingStyle}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = computeRatings(player);
    if (cache.size > 5000) cache.clear();
    cache.set(key, hit);
  }
  return hit;
}

const cache = new Map<string, GameRatings>();

type RatingInput = Parameters<typeof gameRatings>[0];

function computeRatings(player: RatingInput): GameRatings {
  const batForm = player.runs != null ? Math.min(30, player.runs / 25) : player.capped ? 12 : 6;
  const sr = player.strikeRate != null ? Math.min(20, (player.strikeRate - 120) / 6) : 8;
  const avg = player.battingAvg != null ? Math.min(15, player.battingAvg / 4) : 7;
  const six = player.sixes != null ? Math.min(15, player.sixes / 3) : 6;
  const batting = clamp(48 + batForm + sr + (player.role === "BOWLER" ? -8 : 6));

  const wkts = player.wickets != null ? Math.min(30, player.wickets * 1.1) : player.role.includes("BOWL") || player.role === "ALL_ROUNDER" ? 12 : 4;
  const eco = player.economy != null ? Math.min(18, (11 - player.economy) * 6) : 8;
  const bowling = clamp(46 + wkts + eco + (player.role === "BATTER" || player.role === "WICKETKEEPER" ? -10 : 6));

  const market = player.actual2026Price != null ? Math.min(18, player.actual2026Price / 20_000_000) : player.megaBasePrice / 20_000_000;
  const exp = player.capped ? 12 : 6;
  const ageAdj = player.age == null ? 0 : player.age < 23 ? 4 : player.age > 36 ? -6 : 2;
  const overall = clamp((batting + bowling) / 2 + market + exp / 2 + ageAdj + (player.role === "ALL_ROUNDER" ? 4 : 0));

  const spin = /spin|orthodox|wrist|leg|off/i.test(player.bowlingStyle ?? "") ? clamp(bowling + 6) : clamp(bowling - 12);
  return {
    overall,
    batting,
    bowling,
    powerHitting: clamp(42 + six + sr),
    consistency: clamp(50 + avg + (player.capped ? 8 : 0)),
    deathBowling: clamp(bowling + (player.role === "BOWLER" ? 4 : 0)),
    powerplayBowling: clamp(bowling + eco / 2),
    spin,
    fielding: clamp(68 + (player.age && player.age < 28 ? 8 : 0) + (player.role === "WICKETKEEPER" ? 6 : 0)),
    experience: clamp(50 + exp * 2 + (player.age ? Math.min(player.age, 35) / 3 : 5)),
    recentForm: clamp(50 + batForm + wkts / 2),
    label: "GAME RATING",
  };
}
