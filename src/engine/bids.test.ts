import { describe, expect, it } from "vitest";
import { canAfford, incrementFor, nextBidAmount } from "./bids";
import { computeMaxBid, mulberry32, type AiTeamView, type PlayerView } from "./ai";
import { DEFAULT_RULES } from "./rules";
import { gameRatings } from "./ratings";

const rules = DEFAULT_RULES;

describe("bid increments", () => {
  it("uses 5 lakh below 1 crore", () => {
    expect(incrementFor(3_000_000)).toBe(500_000);
    expect(nextBidAmount(3_000_000, 3_000_000)).toBe(3_500_000);
  });
  it("uses 10 lakh between 1 and 2 crore", () => {
    expect(nextBidAmount(10_000_000, 10_000_000)).toBe(11_000_000);
  });
  it("uses 20 lakh between 2 and 5 crore", () => {
    expect(nextBidAmount(20_000_000, 20_000_000)).toBe(22_000_000);
  });
  it("uses 25 lakh above 5 crore", () => {
    expect(nextBidAmount(50_000_000, 20_000_000)).toBe(52_500_000);
  });
  it("opens at base price", () => {
    expect(nextBidAmount(0, 20_000_000)).toBe(20_000_000);
  });
  it("special-cases 1.25 crore to 1.30 crore", () => {
    expect(nextBidAmount(12_500_000, 12_500_000)).toBe(13_000_000);
  });
});

describe("purse rules", () => {
  it("rejects bids over purse", () => {
    expect(canAfford(10_000_000, 11_000_000, 10, rules)).toBe(false);
  });
  it("keeps reserve for minimum squad", () => {
    expect(canAfford(40_000_000, 20_000_000, 16, rules)).toBe(true);
    expect(canAfford(6_000_000, 4_000_000, 16, rules)).toBe(false);
  });
  it("blocks a full squad", () => {
    expect(canAfford(100_000_000, 3_000_000, 25, rules)).toBe(false);
  });
});

describe("AI valuation", () => {
  const player: PlayerView = {
    id: "test-star",
    role: "BATTER",
    isOverseas: false,
    capped: true,
    age: 30,
    basePrice: 20_000_000,
    actual2026Price: 80_000_000,
    megaBasePrice: 20_000_000,
    runs: 600,
    strikeRate: 160,
    battingAvg: 45,
    sixes: 30,
    wickets: null,
    economy: null,
    bowlingAvg: null,
    bowlingStyle: null,
    setCode: "M1",
  };

  function team(personality: AiTeamView["personality"], purse = 400_000_000): AiTeamView {
    return {
      franchiseId: personality,
      personality,
      purse,
      initialPurse: 1_250_000_000,
      squadSize: 8,
      overseasCount: 2,
      roleCounts: { BATTER: 1, BOWLER: 3, ALL_ROUNDER: 3, WICKETKEEPER: 1 },
      isUser: false,
    };
  }

  const ctx = {
    remainingSameRole: 4,
    remainingPremium: 6,
    lotsRemaining: 40,
    totalLots: 80,
    difficulty: "medium" as const,
    rng: () => 0.5,
  };

  it("gives different ceilings to different personalities", () => {
    const agg = computeMaxBid(team("aggressive"), player, ctx, rules);
    const cons = computeMaxBid(team("conservative"), player, ctx, rules);
    expect(agg).toBeGreaterThan(cons);
  });

  it("never exceeds purse reserve", () => {
    const max = computeMaxBid(team("aggressive", 50_000_000), player, ctx, rules);
    expect(max).toBeLessThanOrEqual(50_000_000);
  });

  it("is non-deterministic across rng draws but bounded", () => {
    const a = computeMaxBid(team("balanced"), player, { ...ctx, rng: mulberry32(1) }, rules);
    const b = computeMaxBid(team("balanced"), player, { ...ctx, rng: mulberry32(2) }, rules);
    expect(Math.abs(a - b) < 80_000_000).toBe(true);
  });
});

describe("game ratings", () => {
  it("labels ratings as game-generated", () => {
    const r = gameRatings({
      role: "BATTER",
      capped: true,
      isOverseas: false,
      runs: 675,
      strikeRate: 165,
      battingAvg: 56,
      sixes: 25,
      wickets: null,
      economy: null,
      bowlingAvg: null,
      actual2026Price: null,
      megaBasePrice: 20_000_000,
      age: 37,
      bowlingStyle: "Right Arm Medium",
    });
    expect(r.label).toBe("GAME RATING");
    expect(r.overall).toBeGreaterThanOrEqual(70);
  });
});
