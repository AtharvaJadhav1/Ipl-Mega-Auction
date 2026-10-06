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

function clamp(n: number, lo = 40, hi = 99) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

const unit = (n: number) => Math.max(0, Math.min(1, n));

export type RatingInput = {
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
  /** The marquee set marks genuine superstars. */
  setCode?: string;
};

export function gameRatings(player: RatingInput): GameRatings {
  if (player.id === undefined) return computeRatings(player);
  const key = `${player.id}|${player.runs}|${player.wickets}|${player.strikeRate}|${player.economy}|${player.actual2026Price}|${player.megaBasePrice}|${player.age}|${player.role}|${player.capped}|${player.sixes}|${player.battingAvg}|${player.bowlingAvg}|${player.bowlingStyle}|${player.setCode}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = computeRatings(player);
    if (cache.size > 5000) cache.clear();
    cache.set(key, hit);
  }
  return hit;
}

const cache = new Map<string, GameRatings>();

/**
 * Reputation on a ~45-95 scale. Marquee-set players are the genuine superstars. Everyone else is placed by what the
 * market paid (capped at ₹8 Cr so one-off bidding frenzies don't create superstars) with a lift for capped internationals
 * and a discount for uncapped players.
 */
/** Established superstars (tier S) and top-flight regulars (tier A), keyed by player id. Everyone else is placed by the market. */
const TIER_S = new Set([
  "virat-kohli", "jasprit-bumrah", "rohit-sharma", "rashid-khan", "jos-buttler", "pat-cummins", "hardik-pandya", "shubman-gill",
  "rishabh-pant", "ms-dhoni", "suryakumar-yadav", "yashasvi-jaiswal", "kl-rahul", "heinrich-klaasen", "nicholas-pooran",
]);
const TIER_A = new Set([
  "jofra-archer", "kagiso-rabada", "trent-boult", "sunil-narine", "shreyas-iyer", "mohammed-siraj", "yuzvendra-chahal",
  "ravindra-jadeja", "cameron-green", "travis-head", "abhishek-sharma", "sai-sudharsan", "ruturaj-gaikwad", "tilak-varma",
  "rinku-singh", "arshdeep-singh", "varun-chakaravarthy", "mitchell-starc", "phil-salt", "ishan-kishan",
  "axar-patel", "kuldeep-yadav", "mohammed-shami", "tim-david", "marcus-stoinis", "andre-russell", "matheesha-pathirana",
  "vaibhav-sooryavanshi", "liam-livingstone", "dhruv-jurel", "sanju-samson",
]);

function reputation(p: RatingInput): number {
  if (p.id && TIER_S.has(p.id)) return 86;
  if (p.id && TIER_A.has(p.id)) return 78;
  const crore = Math.min(8, (p.actual2026Price ?? p.megaBasePrice) / 10_000_000);
  const marketed = 48 + 11 * Math.log(1 + crore / 0.5);
  if (p.setCode === "M1") return Math.max(82, Math.min(92, 82 + (marketed - 60) * 0.3));
  return Math.max(45, Math.min(88, marketed + (p.capped ? 2 : -6)));
}

/** Stats move an established player's rating around his reputation, but only within a band. */
function banded(value: number, rep: number, tiered: boolean) {
  return tiered ? Math.max(rep - 8, Math.min(rep + 4, value)) : value;
}

function computeRatings(player: RatingInput): GameRatings {
  const rep = reputation(player);
  const tiered = !!player.id && (TIER_S.has(player.id) || TIER_A.has(player.id));
  const isBowler = player.role === "BOWLER";
  const isAllRounder = player.role === "ALL_ROUNDER";

  // Batting: real 2026 numbers when we have them, blended with reputation; reputation alone otherwise.
  const statBat =
    player.runs != null
      ? 38 +
        unit(player.runs / 800) * 34 +
        unit(((player.strikeRate ?? 125) - 120) / 80) * 14 +
        unit(((player.battingAvg ?? 20) - 18) / 37) * 12
      : null;
  const batBase = isBowler ? 35 + (rep - 45) * 0.35 : isAllRounder ? rep - 6 : rep;
  const batting = clamp(banded(statBat != null ? 0.6 * statBat + 0.4 * (isBowler ? Math.max(batBase, 55) : rep) : batBase, isBowler ? batBase : rep, tiered && !isBowler));

  // Bowling likewise.
  const statBowl =
    player.wickets != null
      ? 38 +
        unit(player.wickets / 28) * 34 +
        unit((9.8 - (player.economy ?? 9.5)) / 3.3) * 16 +
        (player.bowlingAvg != null ? unit((34 - player.bowlingAvg) / 16) * 8 : 0)
      : null;
  const bowlBase = isBowler ? rep : isAllRounder ? rep - 6 : 30 + (rep - 45) * 0.25;
  const bowling = clamp(banded(statBowl != null ? 0.6 * statBowl + 0.4 * (isBowler || isAllRounder ? rep : Math.max(bowlBase, 55)) : bowlBase, isBowler ? rep : bowlBase, tiered && (isBowler || isAllRounder)));

  // Overall follows the player's job: specialists are rated on their craft, all-rounders on both.
  let overall: number;
  if (isBowler) overall = 0.92 * bowling + 0.08 * batting;
  else if (isAllRounder) overall = 0.58 * Math.max(batting, bowling) + 0.42 * Math.min(batting, bowling) + 3;
  else overall = 0.94 * batting + 0.06 * bowling + (player.role === "WICKETKEEPER" ? 1 : 0);
  const ageAdj = player.age == null ? 0 : player.age < 22 ? 1 : player.age > 36 ? -3 : 0;
  // Stretch the top end so genuine stars separate from solid players.
  const stretched = overall > 50 ? 50 + (overall - 50) * 1.15 : overall;
  overall = clamp(stretched + ageAdj);

  const six = player.sixes != null ? Math.min(15, player.sixes / 3) : 6;
  const sr = player.strikeRate != null ? Math.min(20, (player.strikeRate - 120) / 6) : 8;
  const avg = player.battingAvg != null ? Math.min(15, player.battingAvg / 4) : 7;
  const eco = player.economy != null ? Math.min(18, (11 - player.economy) * 6) : 8;
  const wkts = player.wickets != null ? Math.min(30, player.wickets * 1.1) : isBowler || isAllRounder ? 12 : 4;
  const batForm = player.runs != null ? Math.min(30, player.runs / 25) : player.capped ? 12 : 6;
  const exp = player.capped ? 12 : 6;

  const spin = /spin|orthodox|wrist|leg|off/i.test(player.bowlingStyle ?? "") ? clamp(bowling + 6) : clamp(bowling - 12);
  return {
    overall,
    batting,
    bowling,
    powerHitting: clamp(42 + six + sr),
    consistency: clamp(50 + avg + (player.capped ? 8 : 0)),
    deathBowling: clamp(bowling + (isBowler ? 4 : 0)),
    powerplayBowling: clamp(bowling + eco / 2),
    spin,
    fielding: clamp(68 + (player.age && player.age < 28 ? 8 : 0) + (player.role === "WICKETKEEPER" ? 6 : 0)),
    experience: clamp(50 + exp * 2 + (player.age ? Math.min(player.age, 35) / 3 : 5)),
    recentForm: clamp(50 + batForm + wkts / 2),
    label: "GAME RATING",
  };
}
