import { describe, expect, it } from "vitest";
import { computeMaxBid, decideBid, mulberry32, type AiTeamView, type PlayerView } from "@/engine/ai";
import { aiRetentionPicks, CAPPED_SLABS, planRetention, rtmCardsAfterRetention, UNCAPPED_SLAB } from "@/engine/retention";
import { areRivals, franchiseGaps } from "@/engine/strategy";
import { evaluateTrade, tradeValue } from "@/engine/trade";
import { DEFAULT_RULES } from "@/engine/rules";

const rules = { ...DEFAULT_RULES, overseasMaxFee: null };

describe("retention slabs", () => {
  const capped = (id: string, isOverseas = false) => ({ id, capped: true, isOverseas });
  const uncapped = (id: string) => ({ id, capped: false, isOverseas: false });

  it("charges capped slabs in pick order and uncapped at the flat slab", () => {
    const plan = planRetention([capped("a"), capped("b"), uncapped("c"), capped("d")], { maxOverseas: 8 });
    expect(plan.costs).toEqual([CAPPED_SLABS[0], CAPPED_SLABS[1], UNCAPPED_SLAB, CAPPED_SLABS[2]]);
    expect(plan.error).toBeNull();
  });

  it("enforces the six / five / two limits and duplicates", () => {
    expect(planRetention(Array.from({ length: 7 }, (_, i) => uncapped(String(i))), { maxOverseas: 8 }).error).toBeTruthy();
    expect(planRetention([uncapped("a"), uncapped("b"), uncapped("c")], { maxOverseas: 8 }).error).toMatch(/uncapped/);
    expect(planRetention(Array.from({ length: 6 }, (_, i) => capped(String(i))), { maxOverseas: 8 }).error).toMatch(/capped/);
    expect(planRetention([capped("a"), capped("a")], { maxOverseas: 8 }).error).toMatch(/twice/);
    expect(planRetention([capped("a", true), capped("b", true)], { maxOverseas: 1 }).error).toMatch(/Overseas/);
  });

  it("turns unused slots into RTM cards", () => {
    expect(rtmCardsAfterRetention(0)).toBe(6);
    expect(rtmCardsAfterRetention(4)).toBe(2);
    expect(rtmCardsAfterRetention(6)).toBe(0);
  });

  it("lets AI retain its best players without breaking slab rules", () => {
    const ranked = Array.from({ length: 12 }, (_, i) => ({ id: String(i), capped: i < 8, isOverseas: i % 3 === 0 }));
    const picks = aiRetentionPicks(ranked, "star-focused", { maxOverseas: 8, purse: 1_250_000_000 });
    expect(picks.length).toBe(5);
    expect(planRetention(picks, { maxOverseas: 8 }).error).toBeNull();
  });
});

describe("trades", () => {
  const star = { overall: 90, capped: true, role: "BATTER", age: 28 };
  const filler = { overall: 60, capped: false, role: "BATTER", age: 27 };

  it("values stars far above role players", () => {
    expect(tradeValue(star)).toBeGreaterThan(tradeValue(filler) * 3);
  });

  it("rejects lopsided offers and accepts generous ones", () => {
    const needFor = () => 1;
    expect(evaluateTrade({ give: [filler], get: [star], personality: "balanced", needFor }).accepted).toBe(false);
    expect(evaluateTrade({ give: [star], get: [filler], personality: "balanced", needFor }).accepted).toBe(true);
    expect(evaluateTrade({ give: [], get: [star], personality: "balanced", needFor }).accepted).toBe(false);
  });
});

describe("franchise strategy", () => {
  it("derives gaps from the real squads", () => {
    const gaps = franchiseGaps("rcb");
    for (const v of Object.values(gaps.role)) expect(v).toBeGreaterThanOrEqual(0);
    expect(gaps.pace).toBeLessThanOrEqual(1);
  });

  it("knows the classic rivalries", () => {
    expect(areRivals("csk", "mi")).toBe(true);
    expect(areRivals("mi", "csk")).toBe(true);
    expect(areRivals("csk", "pbks")).toBe(false);
  });
});

describe("AI behaviour modifiers", () => {
  const player: PlayerView = {
    id: "p",
    role: "BOWLER",
    isOverseas: false,
    capped: true,
    age: 27,
    basePrice: 20_000_000,
    actual2026Price: null,
    megaBasePrice: 20_000_000,
    runs: null,
    strikeRate: null,
    battingAvg: null,
    sixes: null,
    wickets: 20,
    economy: 8,
    bowlingAvg: null,
    bowlingStyle: "RightArmFast",
    setCode: "BWL",
  };
  const team: AiTeamView = {
    franchiseId: "x",
    personality: "balanced",
    purse: 800_000_000,
    initialPurse: 1_250_000_000,
    squadSize: 10,
    overseasCount: 2,
    roleCounts: { BATTER: 4, BOWLER: 3, ALL_ROUNDER: 2, WICKETKEEPER: 1 },
    isUser: false,
  };
  const ctx = { remainingSameRole: 8, remainingPremium: 8, lotsRemaining: 60, totalLots: 120, difficulty: "medium" as const, rng: () => 0.5 };

  it("bids harder against a user it resents, and for roles it lost", () => {
    const base = computeMaxBid(team, player, ctx, rules);
    expect(computeMaxBid({ ...team, grudge: 4 }, player, { ...ctx, leaderIsUser: true }, rules)).toBeGreaterThan(base);
    expect(computeMaxBid({ ...team, lostRoles: ["BOWLER", "BOWLER"] }, player, ctx, rules)).toBeGreaterThan(base);
  });

  it("fights rivals harder and shops for real squad gaps", () => {
    const base = computeMaxBid(team, player, ctx, rules);
    expect(computeMaxBid(team, player, { ...ctx, rivalLeader: true }, rules)).toBeGreaterThan(base);
    const gappy = { ...team, gaps: { role: { BOWLER: 0.5 }, pace: 1, spin: 0 } };
    expect(computeMaxBid(gappy, player, ctx, rules)).toBeGreaterThan(base);
  });

  it("pays more when the room is cash-rich and less when it is cash-starved", () => {
    const base = computeMaxBid(team, player, { ...ctx, roomMoneyRatio: 1.0 }, rules);
    expect(computeMaxBid(team, player, { ...ctx, roomMoneyRatio: 2 }, rules)).toBeGreaterThan(base);
    expect(computeMaxBid(team, player, { ...ctx, roomMoneyRatio: 0.3 }, rules)).toBeLessThan(base);
  });

  it("sometimes bluffs just past its ceiling, more often when baited by the user", () => {
    const aggressive = { ...team, personality: "aggressive" as const };
    const max = 100_000_000;
    const next = 105_000_000; // just over the ceiling, within the bluff window
    const bids = (leaderIsUser: boolean) => {
      let n = 0;
      for (let i = 0; i < 2000; i++) {
        const rng = mulberry32(i + 1);
        const d = decideBid(aggressive, { ...player, basePrice: next }, 0, null, max, rules, rng, { leaderIsUser });
        if (d.decision === "BID") n++;
      }
      return n;
    };
    expect(bids(false)).toBeGreaterThan(0);
    expect(bids(true)).toBeGreaterThan(bids(false));
  });
});
