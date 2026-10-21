import { canAfford } from "@/engine/bids";
import type { AuctionRules } from "@/engine/rules";

export type FillCandidate = { id: string; role: string; isOverseas: boolean; price: number; overall: number };
export type FillTeam = { purse: number; overseasCount: number; members: { role: string }[] };

function shortfall(members: { role: string }[], rules: AuctionRules) {
  const count = (role: string) => members.filter((m) => m.role === role).length;
  return {
    size: Math.max(0, rules.minSquadSize - members.length),
    keepers: Math.max(0, rules.minWicketkeepers - count("WICKETKEEPER")),
    bowlers: Math.max(0, rules.minBowlers - count("BOWLER")),
  };
}

/**
 * Cheapest legal unsold players that bring a short squad up to the minimum size, keepers and bowlers.
 * Returns the picks in the order they would be signed at their base price; stops early if nobody legal is left.
 */
export function planFill(team: FillTeam, candidates: FillCandidate[], rules: AuctionRules): FillCandidate[] {
  const members = [...team.members];
  const picks: FillCandidate[] = [];
  let purse = team.purse;
  let overseas = team.overseasCount;
  const taken = new Set<string>();
  for (;;) {
    const gap = shortfall(members, rules);
    if (!gap.size && !gap.keepers && !gap.bowlers) break;
    const legal = candidates.filter(
      (c) =>
        !taken.has(c.id) &&
        !(c.isOverseas && overseas >= rules.maxOverseasPlayers) &&
        canAfford(purse, c.price, members.length, rules),
    );
    const wanted = gap.keepers > 0 ? "WICKETKEEPER" : gap.bowlers > 0 ? "BOWLER" : null;
    const pool = wanted && legal.some((c) => c.role === wanted) ? legal.filter((c) => c.role === wanted) : legal;
    const best = [...pool].sort((a, b) => a.price - b.price || b.overall - a.overall)[0];
    if (!best) break;
    picks.push(best);
    taken.add(best.id);
    members.push({ role: best.role });
    purse -= best.price;
    if (best.isOverseas) overseas += 1;
  }
  return picks;
}
