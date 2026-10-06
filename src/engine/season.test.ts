import { describe, expect, it } from "vitest";
import { compositionError } from "@/engine/composition";
import { mulberry32 } from "@/engine/ai";
import { pickXI, simulateSeason, type SeasonPlayer, type SeasonTeamInput } from "@/engine/season";

const rules = { minSquadSize: 18, minWicketkeepers: 2, minBowlers: 6 };

describe("composition rule", () => {
  const roles = (spec: Record<string, number>) => Object.entries(spec).flatMap(([role, n]) => Array.from({ length: n }, () => ({ role })));

  it("allows any buy while there is plenty of room", () => {
    expect(compositionError(roles({ BATTER: 3 }), { role: "BATTER" }, rules)).toBeNull();
  });

  it("blocks a buy that leaves no room for the missing keepers and bowlers", () => {
    // 17 players, no keepers and 4 bowlers -> 2 keepers + 2 bowlers still needed with 0 slots after this buy.
    const squad = roles({ BATTER: 11, BOWLER: 4, ALL_ROUNDER: 2 });
    expect(compositionError(squad, { role: "BATTER" }, rules)).toMatch(/wicketkeeper|bowlers/);
    expect(compositionError(squad, { role: "WICKETKEEPER" }, rules)).not.toBeNull(); // still needs a second keeper and two bowlers
  });

  it("lets a needed role through", () => {
    const squad = roles({ BATTER: 8, BOWLER: 6, WICKETKEEPER: 2, ALL_ROUNDER: 1 });
    expect(compositionError(squad, { role: "BATTER" }, rules)).toBeNull();
  });
});

function squad(prefix: string, n: number, base: number): SeasonPlayer[] {
  const roles = ["WICKETKEEPER", "BATTER", "BATTER", "BATTER", "ALL_ROUNDER", "ALL_ROUNDER", "BOWLER", "BOWLER", "BOWLER", "BOWLER", "BOWLER", "BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"];
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    name: `${prefix} player ${i}`,
    role: roles[i % roles.length],
    isOverseas: i % 3 === 0,
    overall: base - i,
    batting: base - i + (roles[i % roles.length] === "BOWLER" ? -15 : 3),
    bowling: base - i + (roles[i % roles.length] === "BATTER" ? -20 : 3),
  }));
}

describe("season engine", () => {
  const teams: SeasonTeamInput[] = ["A", "B", "C", "D", "E", "F"].map((k, i) => ({ id: k, name: k, shortName: k, players: squad(k, 20, 85 - i * 5) }));

  it("builds a legal XI", () => {
    const xi = pickXI(squad("X", 22, 80));
    expect(xi).toHaveLength(11);
    expect(xi.filter((p) => p.isOverseas).length).toBeLessThanOrEqual(4);
    expect(xi.filter((p) => p.role === "WICKETKEEPER").length).toBeGreaterThanOrEqual(1);
    expect(xi.filter((p) => p.role === "BOWLER" || p.role === "ALL_ROUNDER").length).toBeGreaterThanOrEqual(5);
  });

  it("plays a full double round-robin and playoffs", () => {
    const r = simulateSeason(teams, mulberry32(42));
    expect(r.table).toHaveLength(6);
    expect(r.table.every((row) => row.played === 10)).toBe(true);
    expect(r.table.reduce((a, row) => a + row.won, 0)).toBe(30);
    expect(r.playoffs.map((g) => g.stage)).toEqual(["Qualifier 1", "Eliminator", "Qualifier 2", "Final"]);
    expect(r.champion).toBe(r.playoffs[3].winner);
    expect(r.orangeCap!.runs).toBeGreaterThan(0);
    expect(r.purpleCap!.wickets).toBeGreaterThan(0);
  });

  it("is deterministic for a seed and favours the stronger squad on average", () => {
    expect(simulateSeason(teams, mulberry32(7))).toEqual(simulateSeason(teams, mulberry32(7)));
    let strongTop = 0;
    for (let s = 0; s < 30; s++) {
      const r = simulateSeason(teams, mulberry32(s + 100));
      if (["A", "B"].includes(r.table[0].teamId)) strongTop++;
    }
    expect(strongTop).toBeGreaterThan(15);
  });
});
