export type AuctionRules = {
  seasonYear: number;
  salaryCap: number;
  maxSquadSize: number;
  minSquadSize: number;
  maxOverseasPlayers: number;
  minPlayerPrice: number;
  overseasMaxFee: number | null;
};

export const IPL_2026_RULES: AuctionRules = {
  seasonYear: 2026,
  salaryCap: 1_250_000_000,
  maxSquadSize: 25,
  minSquadSize: 18,
  maxOverseasPlayers: 8,
  minPlayerPrice: 3_000_000,
  overseasMaxFee: 180_000_000,
};

export const DEFAULT_RULES = IPL_2026_RULES;

export function parseRules(json: string): AuctionRules {
  const parsed = JSON.parse(json) as AuctionRules;
  return { ...DEFAULT_RULES, ...parsed };
}
