import { describe, expect, it } from "vitest";
import { planFill, type FillCandidate } from "@/engine/fill";
import { DEFAULT_RULES } from "@/engine/rules";

const rules = DEFAULT_RULES;
const members = (spec: Record<string, number>) => Object.entries(spec).flatMap(([role, n]) => Array.from({ length: n }, () => ({ role })));
const cand = (id: string, role: string, price = 3_000_000, extra: Partial<FillCandidate> = {}): FillCandidate => ({ id, role, isOverseas: false, price, overall: 60, ...extra });

describe("planFill (short squads at the end of the auction)", () => {
  it("does nothing for a valid squad", () => {
    const team = { purse: 50_000_000, overseasCount: 0, members: members({ BATTER: 8, BOWLER: 6, WICKETKEEPER: 2, ALL_ROUNDER: 2 }) };
    expect(planFill(team, [cand("x", "BATTER")], rules)).toEqual([]);
  });

  it("signs a bowler for a 17-man squad with five bowlers", () => {
    const team = { purse: 8_500_000, overseasCount: 8, members: members({ BATTER: 8, BOWLER: 5, WICKETKEEPER: 2, ALL_ROUNDER: 2 }) };
    const picks = planFill(team, [cand("bat", "BATTER", 3_000_000), cand("bowl", "BOWLER", 5_000_000)], rules);
    expect(picks.map((p) => p.id)).toEqual(["bowl"]);
  });

  it("prefers keepers, then bowlers, then the cheapest player", () => {
    const team = { purse: 100_000_000, overseasCount: 0, members: members({ BATTER: 14, BOWLER: 3 }) };
    const pool = [
      cand("b1", "BOWLER", 3_000_000),
      cand("b2", "BOWLER", 3_000_000),
      cand("b3", "BOWLER", 3_000_000),
      cand("k1", "WICKETKEEPER", 5_000_000),
      cand("k2", "WICKETKEEPER", 4_000_000),
      cand("a", "ALL_ROUNDER", 3_000_000),
    ];
    expect(planFill(team, pool, rules).map((p) => p.id)).toEqual(["k2", "k1", "b1", "b2", "b3"]);
  });

  it("skips overseas players at the limit and never overspends", () => {
    const team = { purse: 4_000_000, overseasCount: 8, members: members({ BATTER: 9, BOWLER: 6, WICKETKEEPER: 2 }) };
    const picks = planFill(team, [cand("os", "BOWLER", 3_000_000, { isOverseas: true }), cand("pricey", "BATTER", 9_000_000), cand("ok", "BATTER", 3_500_000)], rules);
    expect(picks.map((p) => p.id)).toEqual(["ok"]);
  });

  it("stops quietly when nobody legal is left", () => {
    const team = { purse: 50_000_000, overseasCount: 0, members: members({ BATTER: 10, BOWLER: 5 }) };
    expect(planFill(team, [], rules)).toEqual([]);
  });
});
