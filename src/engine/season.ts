export type SeasonPlayer = {
  id: string;
  name: string;
  role: string;
  isOverseas: boolean;
  overall: number;
  batting: number;
  bowling: number;
};

export type SeasonTeamInput = {
  id: string;
  name: string;
  shortName: string;
  players: SeasonPlayer[];
  /** Preferred XI (player ids); falls back to the auto-picked best XI when incomplete or invalid. */
  xi?: string[];
};

export type TableRow = {
  teamId: string;
  shortName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  nrr: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
};

export type PlayoffGame = { stage: string; teamA: string; teamB: string; scoreA: number; scoreB: number; winner: string };
export type PlayerLine = { playerId: string; name: string; teamId: string; matches: number; runs: number; wickets: number };

export type SeasonResult = {
  table: TableRow[];
  playoffs: PlayoffGame[];
  champion: string;
  runnerUp: string;
  orangeCap: PlayerLine | null;
  purpleCap: PlayerLine | null;
  mvp: PlayerLine | null;
  topBatters: PlayerLine[];
  topBowlers: PlayerLine[];
  matchCount: number;
  xis: Record<string, string[]>;
  strength: Record<string, { batting: number; bowling: number; depth: number }>;
};

export const XI_MAX_OVERSEAS = 4;

/** Greedy best XI: one keeper, at most four overseas players, at least five bowling options. */
export function pickXI(players: SeasonPlayer[]): SeasonPlayer[] {
  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const xi: SeasonPlayer[] = [];
  const has = (p: SeasonPlayer) => xi.some((x) => x.id === p.id);
  const overseas = () => xi.filter((p) => p.isOverseas).length;
  const canAdd = (p: SeasonPlayer) => !has(p) && (!p.isOverseas || overseas() < XI_MAX_OVERSEAS);

  const keeper = sorted.find((p) => p.role === "WICKETKEEPER");
  if (keeper) xi.push(keeper);
  const bowlingOptions = () => xi.filter((p) => p.role === "BOWLER" || p.role === "ALL_ROUNDER").length;

  // Guarantee bowling depth first, then fill with the best remaining players.
  for (const p of [...sorted].sort((a, b) => b.bowling - a.bowling)) {
    if (xi.length >= 11 || bowlingOptions() >= 5) break;
    if ((p.role === "BOWLER" || p.role === "ALL_ROUNDER") && canAdd(p)) xi.push(p);
  }
  for (const p of sorted) {
    if (xi.length >= 11) break;
    if (canAdd(p)) xi.push(p);
  }
  return xi;
}

function resolveXI(team: SeasonTeamInput): SeasonPlayer[] {
  if (team.xi && team.xi.length === 11) {
    const byId = new Map(team.players.map((p) => [p.id, p]));
    const chosen = team.xi.map((id) => byId.get(id)).filter((p): p is SeasonPlayer => !!p);
    if (chosen.length === 11 && new Set(team.xi).size === 11 && chosen.filter((p) => p.isOverseas).length <= XI_MAX_OVERSEAS) return chosen;
  }
  return pickXI(team.players);
}

const BAT_WEIGHTS = [1.5, 1.45, 1.35, 1.2, 1.0, 0.8, 0.55, 0.3, 0.15, 0.08, 0.05];

type Strength = { batting: number; bowling: number; depth: number };

function strengthOf(xi: SeasonPlayer[]): Strength {
  if (!xi.length) return { batting: 40, bowling: 40, depth: 0 };
  const byBat = [...xi].sort((a, b) => b.batting - a.batting).slice(0, 7);
  const byBowl = [...xi].filter((p) => p.role === "BOWLER" || p.role === "ALL_ROUNDER").sort((a, b) => b.bowling - a.bowling).slice(0, 5);
  const avg = (xs: number[], fallback: number) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback);
  const bowlers = avg(byBowl.map((p) => p.bowling), 45);
  // An XI with fewer than five bowling options loses a little each over the missing quota.
  const shortfall = Math.max(0, 5 - byBowl.length) * 4;
  return { batting: avg(byBat.map((p) => p.batting), 45), bowling: bowlers - shortfall, depth: xi.length / 11 };
}

function gaussian(rng: () => number) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

type MatchOutcome = { scoreA: number; scoreB: number; winner: "A" | "B"; oversA: number; oversB: number; wicketsA: number; wicketsB: number };

function playMatch(a: Strength, b: Strength, rng: () => number): MatchOutcome {
  const score = (bat: Strength, bowl: Strength) => {
    const mean = 162 + (bat.batting - 66) * 1.15 - (bowl.bowling - 62) * 0.95;
    const runs = Math.round(mean + gaussian(rng) * 21);
    return Math.max(80, Math.min(260, runs));
  };
  let scoreA = score(a, b);
  let scoreB = score(b, a);
  if (scoreA === scoreB) {
    if (rng() < 0.5) scoreA += 1;
    else scoreB += 1; // super over
  }
  const winner = scoreA > scoreB ? "A" : "B";
  // The side batting second finishes early when it chases the target down.
  const chaseOvers = () => Math.round((16 + rng() * 3.9) * 10) / 10;
  const wickets = (bowl: Strength) => Math.max(3, Math.min(10, Math.round(6.5 + (bowl.bowling - 62) * 0.06 + gaussian(rng) * 1.4)));
  return {
    scoreA,
    scoreB,
    winner,
    oversA: 20,
    oversB: winner === "B" ? chaseOvers() : 20,
    wicketsA: wickets(b),
    wicketsB: wickets(a),
  };
}

type Tally = Map<string, PlayerLine>;

function credit(tally: Tally, team: SeasonTeamInput, xi: SeasonPlayer[], runs: number, wickets: number, rng: () => number) {
  const order = [...xi].sort((a, b) => b.batting - a.batting);
  const weights = order.map((p, i) => Math.max(0.02, p.batting * (BAT_WEIGHTS[i] ?? 0.05) * (0.6 + rng() * 0.8)));
  const total = weights.reduce((a, b) => a + b, 0);
  order.forEach((p, i) => addLine(tally, team, p, Math.round((runs * weights[i]) / total), 0));
  const bowlers = xi.filter((p) => p.role === "BOWLER" || p.role === "ALL_ROUNDER");
  const pool = bowlers.length ? bowlers : xi;
  const bw = pool.map((p) => Math.max(0.05, Math.pow(p.bowling / 60, 3) * (p.role === "BOWLER" ? 1 : 0.6) * (0.5 + rng() * 1.0)));
  const bt = bw.reduce((a, b) => a + b, 0);
  const shares = pool.map(() => 0);
  for (let w = 0; w < wickets; w++) {
    let r = rng() * bt;
    let idx = 0;
    for (; idx < bw.length - 1; idx++) {
      r -= bw[idx];
      if (r <= 0) break;
    }
    shares[idx] += 1;
  }
  pool.forEach((p, i) => addLine(tally, team, p, 0, shares[i]));
  // Everyone in the XI gets a match played (batters handled above only add runs).
  for (const p of xi) {
    const line = tally.get(p.id)!;
    line.matches += 1;
  }
}

function addLine(tally: Tally, team: SeasonTeamInput, p: SeasonPlayer, runs: number, wickets: number) {
  const line = tally.get(p.id) ?? { playerId: p.id, name: p.name, teamId: team.id, matches: 0, runs: 0, wickets: 0 };
  line.runs += runs;
  line.wickets += wickets;
  tally.set(p.id, line);
}

/** Double round-robin league, then Qualifier 1, Eliminator, Qualifier 2 and the Final. Deterministic for a given rng. */
export function simulateSeason(teams: SeasonTeamInput[], rng: () => number): SeasonResult {
  const xis = new Map(teams.map((t) => [t.id, resolveXI(t)]));
  const strength = new Map(teams.map((t) => [t.id, strengthOf(xis.get(t.id)!)]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const table = new Map<string, TableRow>(
    teams.map((t) => [t.id, { teamId: t.id, shortName: t.shortName, played: 0, won: 0, lost: 0, points: 0, nrr: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0 }]),
  );
  const tally: Tally = new Map();
  let matchCount = 0;

  const play = (idA: string, idB: string, leagueRow: boolean) => {
    const out = playMatch(strength.get(idA)!, strength.get(idB)!, rng);
    credit(tally, teamById.get(idA)!, xis.get(idA)!, out.scoreA, out.wicketsA, rng);
    credit(tally, teamById.get(idB)!, xis.get(idB)!, out.scoreB, out.wicketsB, rng);
    matchCount += 1;
    if (leagueRow) {
      const a = table.get(idA)!;
      const b = table.get(idB)!;
      a.played += 1;
      b.played += 1;
      a.runsFor += out.scoreA;
      a.oversFor += out.oversA;
      a.runsAgainst += out.scoreB;
      a.oversAgainst += out.oversB;
      b.runsFor += out.scoreB;
      b.oversFor += out.oversB;
      b.runsAgainst += out.scoreA;
      b.oversAgainst += out.oversA;
      const w = out.winner === "A" ? a : b;
      const l = out.winner === "A" ? b : a;
      w.won += 1;
      w.points += 2;
      l.lost += 1;
    }
    return out;
  };

  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i !== j) play(teams[i].id, teams[j].id, true);
    }
  }
  const rows = [...table.values()].map((r) => ({
    ...r,
    nrr: Math.round((r.runsFor / Math.max(1, r.oversFor) - r.runsAgainst / Math.max(1, r.oversAgainst)) * 1000) / 1000,
  }));
  rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr);

  const playoffs: PlayoffGame[] = [];
  const game = (stage: string, a: string, b: string) => {
    const out = play(a, b, false);
    const winner = out.winner === "A" ? a : b;
    playoffs.push({ stage, teamA: a, teamB: b, scoreA: out.scoreA, scoreB: out.scoreB, winner });
    return { winner, loser: winner === a ? b : a };
  };
  const [first, second, third, fourth] = rows.map((r) => r.teamId);
  let champion = first;
  let runnerUp = second;
  if (rows.length >= 4) {
    const q1 = game("Qualifier 1", first, second);
    const el = game("Eliminator", third, fourth);
    const q2 = game("Qualifier 2", q1.loser, el.winner);
    const final = game("Final", q1.winner, q2.winner);
    champion = final.winner;
    runnerUp = final.loser;
  }

  const lines = [...tally.values()];
  const best = (key: (l: PlayerLine) => number) => [...lines].sort((a, b) => key(b) - key(a));
  return {
    table: rows,
    playoffs,
    champion,
    runnerUp,
    orangeCap: best((l) => l.runs)[0] ?? null,
    purpleCap: best((l) => l.wickets)[0] ?? null,
    mvp: best((l) => l.runs + l.wickets * 22)[0] ?? null,
    topBatters: best((l) => l.runs).slice(0, 5),
    topBowlers: best((l) => l.wickets).slice(0, 5),
    matchCount,
    xis: Object.fromEntries(teams.map((t) => [t.id, xis.get(t.id)!.map((p) => p.id)])),
    strength: Object.fromEntries(teams.map((t) => [t.id, strength.get(t.id)!])),
  };
}

export function seasonLines(result: SeasonResult, tally: PlayerLine[]) {
  return { result, tally };
}
