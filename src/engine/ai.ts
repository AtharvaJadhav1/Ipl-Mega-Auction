import { canAfford, nextBidAmount } from "@/engine/bids";
import type { AuctionRules } from "@/engine/rules";
import { gameRatings } from "@/engine/ratings";

export type Personality =
  | "aggressive"
  | "conservative"
  | "data-driven"
  | "star-focused"
  | "bowling-focused"
  | "balanced";

export type AiTeamView = {
  franchiseId: string;
  personality: Personality;
  purse: number;
  initialPurse: number;
  squadSize: number;
  overseasCount: number;
  roleCounts: Record<string, number>;
  isUser: boolean;
};

export type PlayerView = {
  id: string;
  role: string;
  isOverseas: boolean;
  capped: boolean;
  age: number | null;
  basePrice: number;
  actual2026Price: number | null;
  megaBasePrice: number;
  runs: number | null;
  strikeRate: number | null;
  battingAvg: number | null;
  sixes: number | null;
  wickets: number | null;
  economy: number | null;
  bowlingAvg: number | null;
  bowlingStyle: string | null;
  setCode: string;
};

export type MarketContext = {
  remainingSameRole: number;
  remainingPremium: number;
  lotsRemaining: number;
  totalLots: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
  rng: () => number;
  /** Multiplier applied to batter/keeper valuations (Bowling factory challenge). */
  batterBias?: number;
};

const PERSONALITY_MULT: Record<Personality, number> = {
  aggressive: 1.18,
  conservative: 0.86,
  "data-driven": 1.0,
  "star-focused": 1.12,
  "bowling-focused": 1.0,
  balanced: 0.98,
};

const DIFF_SPREAD: Record<MarketContext["difficulty"], number> = {
  easy: 0.22,
  medium: 0.14,
  hard: 0.08,
  expert: 0.05,
};

export function roleNeed(team: AiTeamView, role: string): number {
  const n = team.roleCounts[role] ?? 0;
  const target =
    role === "BATTER" ? 7 : role === "BOWLER" ? 8 : role === "ALL_ROUNDER" ? 5 : 3;
  if (n >= target + 2) return 0.55;
  if (n >= target) return 0.85;
  if (n === 0) return 1.45;
  return 1 + (target - n) * 0.12;
}

export function computeMaxBid(
  team: AiTeamView,
  player: PlayerView,
  ctx: MarketContext,
  rules: AuctionRules,
): number {
  const rating = gameRatings(player);
  const quality = rating.overall / 100;
  let value = player.basePrice * (2.2 + quality * 8);

  if (player.actual2026Price) {
    value = value * 0.45 + player.actual2026Price * 0.55;
  }

  if (player.setCode === "M1") value *= 1.25;
  if (!player.capped && rating.overall > 70) value *= 1.15;
  if (player.isOverseas) value *= 1.05;
  if (ctx.batterBias && (player.role === "BATTER" || player.role === "WICKETKEEPER")) value *= ctx.batterBias;

  value *= PERSONALITY_MULT[team.personality];
  if (team.personality === "bowling-focused" && (player.role === "BOWLER" || player.role === "ALL_ROUNDER")) {
    value *= 1.2;
  }
  if (team.personality === "star-focused" && rating.overall >= 82) value *= 1.22;
  if (team.personality === "conservative" && player.basePrice >= 20_000_000) value *= 0.9;

  value *= roleNeed(team, player.role);

  if (player.isOverseas) {
    const slots = rules.maxOverseasPlayers - team.overseasCount;
    if (slots <= 0) return 0;
    if (slots === 1) value *= 0.82;
    else value *= 1 + Math.min(0.15, slots * 0.02);
  }

  const stage = ctx.lotsRemaining / Math.max(1, ctx.totalLots);
  if (stage > 0.7 && team.personality !== "aggressive") value *= 0.9;
  if (stage < 0.25 && team.squadSize < rules.minSquadSize) value *= 1.12;
  if (ctx.remainingSameRole <= 2) value *= 1.18;
  if (ctx.remainingPremium <= 3 && rating.overall >= 80) value *= 1.1;

  const pursePressure = team.purse / Math.max(1, team.initialPurse);
  if (pursePressure < 0.15) value *= 0.72;
  if (pursePressure > 0.5 && team.personality === "aggressive") value *= 1.08;

  const slotsLeft = rules.maxSquadSize - team.squadSize;
  const avgLeft = slotsLeft > 0 ? team.purse / slotsLeft : 0;
  if (ctx.difficulty === "expert" && value > avgLeft * 3 && rating.overall < 85) {
    value *= 0.7;
  }

  const spread = DIFF_SPREAD[ctx.difficulty];
  const jitter = 1 - spread + ctx.rng() * spread * 2;
  value *= jitter;

  const maxAffordableCeiling = team.purse - Math.max(0, rules.minSquadSize - team.squadSize - 1) * rules.minPlayerPrice;
  if (player.isOverseas && rules.overseasMaxFee != null) value = Math.min(value, rules.overseasMaxFee);
  return Math.max(0, Math.min(Math.round(value), maxAffordableCeiling));
}

export type AiDecision = "BID" | "PASS" | "WAIT" | "AGGRESSIVE";

export function decideBid(
  team: AiTeamView,
  player: PlayerView,
  currentBid: number,
  currentBidderId: string | null,
  maxBid: number,
  rules: AuctionRules,
  rng: () => number,
): { decision: AiDecision; amount: number | null } {
  if (team.isUser) return { decision: "WAIT", amount: null };
  if (currentBidderId === team.franchiseId) return { decision: "WAIT", amount: null };
  const next = nextBidAmount(currentBid, player.basePrice);
  if (
    !canAfford(team.purse, next, team.squadSize, rules) ||
    (player.isOverseas && team.overseasCount >= rules.maxOverseasPlayers) ||
    team.squadSize >= rules.maxSquadSize
  ) {
    return { decision: "PASS", amount: null };
  }
  if (next > maxBid) {
    if (rng() < 0.06 && next <= maxBid * 1.08 && ratingBump(player)) {
      return { decision: "BID", amount: next };
    }
    return { decision: "PASS", amount: null };
  }
  if (next > maxBid * 0.92 && rng() < 0.22) {
    return { decision: "WAIT", amount: null };
  }
  if (next < maxBid * 0.7 && rng() < 0.28) {
    return { decision: "AGGRESSIVE", amount: next };
  }
  if (rng() < 0.12) return { decision: "WAIT", amount: null };
  return { decision: "BID", amount: next };
}

function ratingBump(player: PlayerView) {
  return gameRatings(player).overall >= 80;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
