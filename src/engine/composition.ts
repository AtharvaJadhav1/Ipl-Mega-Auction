import type { AuctionRules } from "@/engine/rules";

/**
 * Squad-composition rule: a franchise must always be able to finish with a workable squad.
 * Buying a player is blocked if the slots left before the minimum squad size could no longer cover
 * the wicketkeepers and specialist bowlers the squad still lacks.
 */
export function compositionError(
  members: { role: string }[],
  incoming: { role: string },
  rules: Pick<AuctionRules, "minSquadSize" | "minWicketkeepers" | "minBowlers">,
): string | null {
  const size = members.length + 1;
  const count = (role: string) => members.filter((m) => m.role === role).length + (incoming.role === role ? 1 : 0);
  const needKeepers = Math.max(0, rules.minWicketkeepers - count("WICKETKEEPER"));
  const needBowlers = Math.max(0, rules.minBowlers - count("BOWLER"));
  const slotsLeft = Math.max(0, rules.minSquadSize - size);
  if (needKeepers + needBowlers <= slotsLeft) return null;
  if (needKeepers > 0 && needKeepers >= needBowlers) {
    return `Keep a slot for a wicketkeeper: every squad needs at least ${rules.minWicketkeepers}.`;
  }
  return `Keep slots for specialist bowlers: every squad needs at least ${rules.minBowlers}.`;
}
