import { describe, expect, it } from "vitest";
import { gameRatings, type RatingInput } from "@/engine/ratings";

const base: RatingInput = {
  role: "BATTER", capped: true, isOverseas: false, runs: null, strikeRate: null, battingAvg: null, sixes: null,
  wickets: null, economy: null, bowlingAvg: null, actual2026Price: null, megaBasePrice: 15_000_000, age: 28, bowlingStyle: null,
};

describe("game ratings", () => {
  it("rates a specialist batter on batting, not penalised for having no bowling", () => {
    const batter = gameRatings({ ...base, runs: 700, strikeRate: 160, battingAvg: 50 });
    expect(batter.overall).toBeGreaterThanOrEqual(76);
    expect(batter.overall).toBeGreaterThanOrEqual(batter.batting - 4);
  });

  it("rates a specialist bowler on bowling", () => {
    const bowler = gameRatings({ ...base, role: "BOWLER", wickets: 24, economy: 7.8, bowlingAvg: 20 });
    expect(bowler.overall).toBeGreaterThanOrEqual(74);
    expect(bowler.bowling).toBeGreaterThan(bowler.batting);
  });

  it("keeps unproven uncapped players well below established stars", () => {
    const fringe = gameRatings({ ...base, capped: false, megaBasePrice: 3_000_000 });
    const star = gameRatings({ ...base, id: "virat-kohli", runs: 675, strikeRate: 165, battingAvg: 56, age: 37 });
    expect(fringe.overall).toBeLessThan(60);
    expect(star.overall).toBeGreaterThanOrEqual(80);
    expect(star.overall).toBeLessThanOrEqual(92);
  });

  it("does not let a one-off auction frenzy create a superstar", () => {
    const frenzy = gameRatings({ ...base, id: "some-teen", capped: false, role: "ALL_ROUNDER", actual2026Price: 142_000_000, megaBasePrice: 3_000_000 });
    expect(frenzy.overall).toBeLessThan(78);
  });

  it("stays within 40-99", () => {
    for (const runs of [0, 400, 1200]) {
      const o = gameRatings({ ...base, runs, strikeRate: 250, battingAvg: 90 }).overall;
      expect(o).toBeGreaterThanOrEqual(40);
      expect(o).toBeLessThanOrEqual(99);
    }
  });
});
