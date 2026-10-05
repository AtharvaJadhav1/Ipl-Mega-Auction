import { gameRatings } from "@/engine/ratings";

export type SquadPlayer = {
  role: string;
  isOverseas: boolean;
  age: number | null;
  price: number;
  actual2026Price: number | null;
  runs: number | null;
  strikeRate: number | null;
  battingAvg: number | null;
  sixes: number | null;
  wickets: number | null;
  economy: number | null;
  bowlingAvg: number | null;
  bowlingStyle: string | null;
  capped: boolean;
  megaBasePrice: number;
};

export type TeamScore = {
  overall: number;
  batting: number;
  bowling: number;
  allRounder: number;
  bench: number;
  indianCore: number;
  overseas: number;
  ageProfile: number;
  value: number;
  balance: number;
  notes: string[];
};

export function scoreSquad(players: SquadPlayer[]): TeamScore {
  if (players.length === 0) {
    return {
      overall: 0,
      batting: 0,
      bowling: 0,
      allRounder: 0,
      bench: 0,
      indianCore: 0,
      overseas: 0,
      ageProfile: 0,
      value: 0,
      balance: 0,
      notes: ["No players in squad."],
    };
  }
  const ratings = players.map((p) => gameRatings(p));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const batters = ratings.filter((_, i) => players[i].role === "BATTER" || players[i].role === "WICKETKEEPER");
  const bowlers = ratings.filter((_, i) => players[i].role === "BOWLER");
  const ar = ratings.filter((_, i) => players[i].role === "ALL_ROUNDER");
  const indian = ratings.filter((_, i) => !players[i].isOverseas);
  const overseas = ratings.filter((_, i) => players[i].isOverseas);
  const ages = players.map((p) => p.age).filter((a): a is number => a != null);
  const ageScore = ages.length ? Math.max(40, 90 - Math.abs(28 - avg(ages)) * 3) : 70;
  const valueHits = players.map((p, i) => {
    if (!p.actual2026Price || p.price <= 0) return ratings[i].overall;
    const ratio = p.actual2026Price / p.price;
    return Math.min(99, 55 + ratio * 20 + ratings[i].overall * 0.2);
  });
  const roleBalance =
    100 -
    Math.abs(7 - players.filter((p) => p.role === "BATTER").length) * 4 -
    Math.abs(8 - players.filter((p) => p.role === "BOWLER").length) * 4 -
    Math.abs(5 - players.filter((p) => p.role === "ALL_ROUNDER").length) * 3 -
    Math.abs(3 - players.filter((p) => p.role === "WICKETKEEPER").length) * 6;
  const batting = avg(batters.map((r) => r.batting));
  const bowling = avg(bowlers.map((r) => r.bowling));
  const allRounder = avg(ar.map((r) => r.overall));
  const bench = avg([...ratings].sort((a, b) => a.overall - b.overall).slice(0, Math.max(1, ratings.length - 11)).map((r) => r.overall));
  const indianCore = avg(indian.map((r) => r.overall));
  const overseasS = avg(overseas.map((r) => r.overall));
  const value = avg(valueHits);
  const balance = Math.max(40, Math.min(99, roleBalance));
  const overall = Math.round(
    batting * 0.22 +
      bowling * 0.22 +
      allRounder * 0.1 +
      indianCore * 0.12 +
      overseasS * 0.1 +
      value * 0.12 +
      balance * 0.12,
  );
  const notes: string[] = [];
  if (players.filter((p) => p.role === "WICKETKEEPER").length < 2) notes.push("Thin wicketkeeping cover.");
  if (players.filter((p) => p.role === "BOWLER").length < 6) notes.push("Bowling stocks look light.");
  if (players.filter((p) => p.isOverseas).length >= 8) notes.push("Overseas cap is full — XI flexibility is tight.");
  if (batting >= 85) notes.push("Elite batting core.");
  if (bowling >= 85) notes.push("High-end bowling attack.");
  return {
    overall: Math.max(0, Math.min(100, overall)),
    batting: Math.round(batting || 0),
    bowling: Math.round(bowling || 0),
    allRounder: Math.round(allRounder || 0),
    bench: Math.round(bench || 0),
    indianCore: Math.round(indianCore || 0),
    overseas: Math.round(overseasS || 0),
    ageProfile: Math.round(ageScore),
    value: Math.round(value || 0),
    balance: Math.round(balance),
    notes,
  };
}

export function bestAndWorst(players: { name: string; price: number; actual2026Price: number | null; overall: number }[]) {
  const bought = players.filter((p) => p.price > 0);
  const bargains = bought
    .filter((p) => p.actual2026Price && p.actual2026Price > 0)
    .map((p) => ({ ...p, value: p.actual2026Price! / p.price }))
    .sort((a, b) => b.value - a.value);
  const overpay = bargains.filter((p) => p.value < 1).sort((a, b) => a.value - b.value);
  const bestPurchase = [...bought].sort((a, b) => b.overall / Math.max(1, b.price) - a.overall / Math.max(1, a.price))[0];
  return {
    bestPurchase,
    biggestOverpay: overpay[0],
    bestValue: bargains[0],
  };
}

export type WhatIfResult = {
  title: string;
  detail: string;
};

export function whatIfStoppedAt(playerName: string, paid: number, stopAt: number, actual: number | null): WhatIfResult {
  if (paid <= stopAt) {
    return {
      title: `What if you stopped at ${stopAt}?`,
      detail: `You already paid ${paid}, which is at or below that ceiling.`,
    };
  }
  const saved = paid - stopAt;
  const vsMarket =
    actual != null
      ? actual > stopAt
        ? `The 2026 market cleared at a higher price, so walking away would have risked losing the player.`
        : `The 2026 sold price was lower than you paid, so a tighter cap would have been closer to history.`
      : `No 2026 auction price exists for this player (retained/trade/unknown).`;
  return {
    title: `What if you had stopped bidding at this lower cap?`,
    detail: `On ${playerName}, you would have saved the difference of ${saved} rupees in-game. ${vsMarket}`,
  };
}
