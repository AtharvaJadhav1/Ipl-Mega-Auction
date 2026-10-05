import { Prisma } from "@prisma/client";
import { FRANCHISES } from "@/data/franchises";
import { PLAYER_SEEDS, SETS, type PlayerSeed } from "@/data/players";
import { computeMaxBid, decideBid, mulberry32, type AiTeamView, type PlayerView } from "@/engine/ai";
import { canAfford, nextBidAmount } from "@/engine/bids";
import { commentaryFor } from "@/engine/commentary";
import { gameRatings } from "@/engine/ratings";
import { DEFAULT_RULES, parseRules, type AuctionRules } from "@/engine/rules";
import { prisma } from "@/lib/prisma";

export const CHALLENGES = [
  { id: "budget-50", name: "₹50 Cr rebuild", purse: 500_000_000, detail: "Complete a valid squad of at least 18 players on a ₹50 Cr purse." },
  { id: "bowling-attack", name: "Bowling factory", purse: null, detail: "Build an attack of at least 7 specialist bowlers — AI rivals spend harder on batters." },
  { id: "eight-indian", name: "Indian core", purse: null, detail: "Complete a valid squad with at least 8 Indian players." },
  { id: "young-squad", name: "Youth draft", purse: null, detail: "Finish with an average squad age of 26 or lower (players with unknown age are ignored)." },
  { id: "overseas-tight", name: "Four overseas", purse: null, detail: "Complete a valid squad with no more than 4 overseas players." },
];

export function challengeStatus(
  challengeId: string | null,
  members: { player: { role: string; isOverseas: boolean; age: number | null } }[],
  rules: AuctionRules,
) {
  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) return null;
  const validSquad = members.length >= rules.minSquadSize && members.length <= rules.maxSquadSize;
  const indian = members.filter((m) => !m.player.isOverseas).length;
  const overseas = members.length - indian;
  const bowlers = members.filter((m) => m.player.role === "BOWLER").length;
  const ages = members.map((m) => m.player.age).filter((a): a is number => a != null);
  const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null;
  let met = validSquad;
  let progress = `${members.length}/${rules.minSquadSize} players`;
  switch (challenge.id) {
    case "bowling-attack":
      met = validSquad && bowlers >= 7;
      progress = `${bowlers}/7 specialist bowlers`;
      break;
    case "eight-indian":
      met = validSquad && indian >= 8;
      progress = `${indian}/8 Indian players`;
      break;
    case "young-squad":
      met = validSquad && avgAge != null && avgAge <= 26;
      progress = avgAge != null ? `Average age ${avgAge.toFixed(1)} (target 26 or lower)` : "No ages known yet";
      break;
    case "overseas-tight":
      met = validSquad && overseas <= 4;
      progress = `${overseas}/4 overseas players`;
      break;
  }
  return { id: challenge.id, name: challenge.name, detail: challenge.detail, met, progress };
}

const includeSession = {
  teams: {
    include: {
      franchise: true,
      members: { include: { player: true } },
    },
  },
  lots: { include: { player: true }, orderBy: { orderIndex: "asc" as const } },
  events: { orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: 80 },
  bids: { orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: 40 },
  playingXi: { orderBy: { orderIndex: "asc" as const } },
} satisfies Prisma.AuctionSessionInclude;

export type FullSession = Prisma.AuctionSessionGetPayload<{ include: typeof includeSession }>;

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function roleCounts(members: { player: { role: string } }[]) {
  const counts: Record<string, number> = { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 };
  for (const m of members) counts[m.player.role] = (counts[m.player.role] ?? 0) + 1;
  return counts;
}

function toPlayerView(p: PlayerSeed | FullSession["lots"][number]["player"], basePrice: number): PlayerView {
  return {
    id: p.id,
    role: p.role,
    isOverseas: p.isOverseas,
    capped: p.capped,
    age: p.age,
    basePrice,
    actual2026Price: p.actual2026Price,
    megaBasePrice: p.megaBasePrice,
    runs: p.runs,
    strikeRate: p.strikeRate,
    battingAvg: p.battingAvg,
    sixes: p.sixes,
    wickets: p.wickets,
    economy: p.economy,
    bowlingAvg: p.bowlingAvg,
    bowlingStyle: p.bowlingStyle,
    setCode: p.setCode,
  };
}

function toAiTeam(t: FullSession["teams"][number]): AiTeamView {
  return {
    franchiseId: t.franchiseId,
    personality: t.franchise.personality as AiTeamView["personality"],
    purse: t.purse,
    initialPurse: t.initialPurse,
    squadSize: t.members.length,
    overseasCount: t.overseasCount,
    roleCounts: roleCounts(t.members),
    isUser: t.isUser,
  };
}

async function addEvent(
  sessionId: string,
  type: string,
  message: string,
  extra?: { playerId?: string; teamId?: string; amount?: number },
) {
  await prisma.auctionEvent.create({
    data: { sessionId, type, message, playerId: extra?.playerId, teamId: extra?.teamId, amount: extra?.amount },
  });
}

let catalogReady = false;

export async function ensureCatalog() {
  const seasonId = "ipl-2026";
  if (catalogReady) return seasonId;

  await prisma.season.upsert({
    where: { id: seasonId },
    update: {},
    create: {
      id: seasonId,
      year: 2026,
      name: "Indian Premier League 2026",
      salaryCap: DEFAULT_RULES.salaryCap,
      source: "IPL.com stats + Sportstar auction list + Olympics.com squads",
      sourceUrl: "https://www.ipl.com/series/indian-premier-league-2026-129908/stats",
      lastVerifiedAt: "2026-09-13",
    },
  });

  for (const f of FRANCHISES) {
    await prisma.franchise.upsert({
      where: { id: f.id },
      update: {
        name: f.name,
        shortName: f.shortName,
        city: f.city,
        primary: f.primary,
        secondary: f.secondary,
        accent: f.accent,
        personality: f.personality,
      },
      create: {
        id: f.id,
        name: f.name,
        shortName: f.shortName,
        city: f.city,
        primary: f.primary,
        secondary: f.secondary,
        accent: f.accent,
        personality: f.personality,
      },
    });
  }

  const have = new Set((await prisma.player.findMany({ where: { seasonId }, select: { id: true } })).map((p) => p.id));
  const missing = PLAYER_SEEDS.filter((p) => !have.has(p.id));
  if (missing.length) {
    await prisma.player.createMany({ data: missing.map((p) => ({ ...p, seasonId })) });
  }
  catalogReady = true;
  return seasonId;
}

function poolForMode(mode: string) {
  let pool = [...PLAYER_SEEDS];
  if (mode === "mini") {
    pool = pool.filter((p) => p.acquisition === "auction" || p.acquisition === "unsold");
  }
  if (mode === "quick") {
    pool = pool.filter((p) => ["M1", "BAT", "BWL", "AR", "WK"].includes(p.setCode) || (p.actual2026Price ?? 0) >= 200_000_000);
    const extra = PLAYER_SEEDS.filter((p) => !pool.includes(p) && p.capped).slice(0, 24);
    pool = [...pool, ...extra];
  }
  const seen = new Set<string>();
  return pool.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function startAuction(input: {
  userFranchiseId: string;
  mode: string;
  difficulty: string;
  speed: string;
  soundEnabled: boolean;
  aiAggression: number;
  challengeId?: string;
  customPurse?: number;
  maxOverseas?: number;
}) {
  const seasonId = await ensureCatalog();
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const rng = mulberry32(seed);
  const challenge = CHALLENGES.find((c) => c.id === input.challengeId);
  const custom = input.mode === "custom";
  const mini = input.mode === "mini";
  const rules: AuctionRules = {
    ...DEFAULT_RULES,
    maxOverseasPlayers:
      input.challengeId === "overseas-tight" ? 4 : custom ? input.maxOverseas ?? DEFAULT_RULES.maxOverseasPlayers : DEFAULT_RULES.maxOverseasPlayers,
    salaryCap: challenge?.purse ?? (custom ? input.customPurse : undefined) ?? DEFAULT_RULES.salaryCap,
    // The overseas fee cap only applies in the real 2026 mini-auction.
    overseasMaxFee: mini ? DEFAULT_RULES.overseasMaxFee : null,
  };

  const sessionId = crypto.randomUUID();
  try {
    await prisma.auctionSession.create({
      data: {
        id: sessionId,
        seasonId,
        mode: input.mode,
        difficulty: input.difficulty,
        speed: input.speed,
        userFranchiseId: input.userFranchiseId,
        status: "LIVE",
        phase: "INTRO",
        seed,
        soundEnabled: input.soundEnabled,
        aiAggression: input.aiAggression,
        challengeId: input.challengeId,
        customPurse: custom ? input.customPurse : undefined,
        rulesJson: JSON.stringify(rules),
      },
    });

    for (const f of FRANCHISES) {
      const isUser = f.id === input.userFranchiseId;
      const purse = challenge?.purse ?? (mini ? f.miniPurse : rules.salaryCap);
      const retained = mini
        ? PLAYER_SEEDS.filter((p) => p.actual2026TeamId === f.id && (p.acquisition === "retained" || p.acquisition === "trade"))
        : [];
      await prisma.sessionTeam.create({
        data: {
          sessionId,
          franchiseId: f.id,
          isUser,
          purse,
          initialPurse: purse,
          overseasCount: retained.filter((p) => p.isOverseas).length,
          members: {
            create: retained.map((p) => ({ playerId: p.id, price: 0, source: p.acquisition })),
          },
        },
      });
    }

    const pool = poolForMode(input.mode);
    const orderedSets = [...SETS].sort((a, b) => a.order - b.order);
    let index = 0;
    const lotRows = [];
    for (const set of orderedSets) {
      const group = shuffle(
        pool.filter((p) => p.setCode === set.code),
        rng,
      );
      for (const p of group) {
        lotRows.push({
          sessionId,
          playerId: p.id,
          orderIndex: index++,
          setCode: p.setCode,
          status: "PENDING",
          currentBid: 0,
        });
      }
    }
    if (lotRows.length) await prisma.auctionLot.createMany({ data: lotRows });

    const first = await prisma.auctionLot.findFirst({
      where: { sessionId },
      orderBy: { orderIndex: "asc" },
      include: { player: true },
    });
    if (first) {
      await prisma.auctionLot.update({ where: { id: first.id }, data: { status: "LIVE" } });
      await addEvent(sessionId, "SET_STARTED", `Set ${SETS.find((s) => s.code === first.setCode)?.name ?? first.setCode} opens.`);
      await addEvent(
        sessionId,
        "PLAYER_STARTED",
        commentaryFor({ type: "PLAYER_STARTED", playerName: first.player.name, amount: mini ? first.player.basePrice : first.player.megaBasePrice }),
        { playerId: first.playerId },
      );
    }
  } catch (e) {
    await prisma.auctionSession.deleteMany({ where: { id: sessionId } });
    throw e;
  }

  return getSession(sessionId);
}

export async function getSession(id: string) {
  const session = await prisma.auctionSession.findUnique({
    where: { id },
    include: includeSession,
  });
  if (!session) return null;
  return decorate(session);
}

export function decorate(session: FullSession) {
  const rules = parseRules(session.rulesJson);
  const lot = session.lots[session.currentLotIndex] ?? null;
  const basePrice =
    lot == null ? 0 : session.mode === "mini" ? lot.player.basePrice : lot.player.megaBasePrice;
  const nextBid = lot ? nextBidAmount(lot.currentBid, basePrice) : 0;
  const user = session.teams.find((t) => t.isUser)!;
  const passed: string[] = lot ? (JSON.parse(lot.passedTeamIds) as string[]) : [];
  const remaining = session.lots.filter((l) => l.status === "PENDING" || l.status === "LIVE");
  const needs = squadNeeds(user.members.map((m) => m.player.role), user.overseasCount, rules);

  const intelligence = lot
    ? session.teams
        .filter((t) => !t.isUser)
        .map((t) => {
          const max = aiMaxBid(session, t, lot, rules, () => 0.5);
          return {
            teamId: t.franchiseId,
            shortName: t.franchise.shortName,
            canAfford: canAfford(t.purse, nextBid, t.members.length, rules) && !(lot.player.isOverseas && t.overseasCount >= rules.maxOverseasPlayers),
            likely: max >= nextBid && !passed.includes(t.franchiseId),
            maxVisible: session.difficulty === "easy",
            maxBid: session.difficulty === "easy" ? max : null,
            need: roleCounts(t.members)[lot.player.role] < 3,
          };
        })
    : [];

  const userBidError = !lot
    ? null
    : lot.currentBidderId === user.franchiseId
      ? "You already hold the highest bid."
      : passed.includes(user.franchiseId)
        ? "You have passed on this player."
        : validatePurchase(user, lot.player, nextBid, rules);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { seed: _seed, ...publicSession } = session;
  return {
    ...publicSession,
    userBidError,
    challenge: challengeStatus(session.challengeId, user.members, rules),
    lots: session.lots.map((l) => ({
      id: l.id,
      orderIndex: l.orderIndex,
      setCode: l.setCode,
      status: l.status,
      soldPrice: l.soldPrice,
      soldTeamId: l.soldTeamId,
      playerId: l.playerId,
      player: { id: l.player.id, name: l.player.name, role: l.player.role },
    })),
    rules,
    currentLot: lot,
    basePrice,
    nextBid,
    passedTeamIds: passed,
    userTeam: user,
    needs,
    intelligence,
    setName: SETS.find((s) => s.code === lot?.setCode)?.name ?? lot?.setCode ?? "",
    remainingLots: remaining.length,
    ratings: lot ? gameRatings(lot.player) : null,
    teamRatings: Object.fromEntries(
      session.teams.map((t) => [
        t.franchiseId,
        gameRatingsAvg(t.members.map((m) => m.player)),
      ]),
    ),
    lotsRemainingSameRole: lot
      ? session.lots.filter((l) => (l.status === "PENDING" || l.status === "LIVE") && l.player.role === lot.player.role).length
      : 0,
  };
}

function gameRatingsAvg(players: FullSession["lots"][number]["player"][]) {
  if (!players.length) return 0;
  return Math.round(players.reduce((s, p) => s + gameRatings(p).overall, 0) / players.length);
}

function squadNeeds(roles: string[], overseas: number, rules: AuctionRules) {
  const c: Record<string, number> = { BATTER: 0, BOWLER: 0, ALL_ROUNDER: 0, WICKETKEEPER: 0 };
  for (const r of roles) c[r] = (c[r] ?? 0) + 1;
  const items = [
    { label: "Fast bowler / bowling stocks", stars: c.BOWLER < 5 ? 5 : c.BOWLER < 7 ? 3 : 1, role: "BOWLER" },
    { label: "Middle-order batter", stars: c.BATTER < 5 ? 4 : c.BATTER < 7 ? 2 : 1, role: "BATTER" },
    { label: "All-rounder", stars: c.ALL_ROUNDER < 3 ? 4 : 2, role: "ALL_ROUNDER" },
    { label: "Wicketkeeper cover", stars: c.WICKETKEEPER < 2 ? 5 : 1, role: "WICKETKEEPER" },
    { label: "Overseas slot", stars: overseas >= rules.maxOverseasPlayers ? 1 : overseas < 4 ? 3 : 2, role: "OVERSEAS" },
  ].sort((a, b) => b.stars - a.stars);
  return { counts: c, overseas, items };
}

function marketCtx(session: FullSession, lot: FullSession["lots"][number], rules: AuctionRules, rng: () => number) {
  const pending = session.lots.filter((l) => l.status === "PENDING" || l.status === "LIVE");
  return {
    remainingSameRole: pending.filter((l) => l.player.role === lot.player.role).length,
    remainingPremium: pending.filter((l) => gameRatings(l.player).overall >= 80).length,
    lotsRemaining: pending.length,
    totalLots: session.lots.length,
    difficulty: session.difficulty as "easy" | "medium" | "hard" | "expert",
    rng,
    batterBias: session.challengeId === "bowling-attack" ? 1.18 : undefined,
  };
}

/** The AI's real ceiling for a lot, including the user-chosen aggression. Used by both ticks and the intel panel. */
function aiMaxBid(session: FullSession, team: FullSession["teams"][number], lot: FullSession["lots"][number], rules: AuctionRules, rng: () => number) {
  const max = computeMaxBid(toAiTeam(team), toPlayerView(lot.player, lotBase(session, lot)), marketCtx(session, lot, rules, rng), rules);
  return Math.round(max * (0.85 + (session.aiAggression / 100) * 0.35));
}

function lotBase(session: FullSession, lot: FullSession["lots"][number]) {
  return session.mode === "mini" ? lot.player.basePrice : lot.player.megaBasePrice;
}

export async function startBidding(sessionId: string) {
  const session = await load(sessionId);
  if (session.status !== "LIVE" || session.phase !== "INTRO") {
    return decorate(session);
  }
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "BIDDING", hammerCount: 0 } });
  return getSession(sessionId);
}

export async function placeUserBid(sessionId: string, kind: "increment" | "pass") {
  const session = await load(sessionId);
  if (session.status !== "LIVE") throw new Error("Auction already completed.");
  if (session.phase !== "BIDDING" && session.phase !== "HAMMER") throw new Error("Bidding is not open for this player.");
  const lot = session.lots[session.currentLotIndex];
  if (!lot || lot.status !== "LIVE") throw new Error("Player is no longer available.");
  const user = session.teams.find((t) => t.isUser)!;
  const passed = JSON.parse(lot.passedTeamIds) as string[];
  if (kind === "pass") {
    if (lot.currentBidderId === user.franchiseId) throw new Error("You already hold the highest bid.");
    if (!passed.includes(user.franchiseId)) passed.push(user.franchiseId);
    await prisma.auctionLot.update({ where: { id: lot.id }, data: { passedTeamIds: JSON.stringify(passed) } });
    await addEvent(sessionId, "PASS", commentaryFor({ type: "PASS", teamName: user.franchise.shortName }), {
      playerId: lot.playerId,
      teamId: user.franchiseId,
    });
    await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "BIDDING", hammerCount: 0 } });
    return tickAuction(sessionId, { forceAi: true });
  }

  if (passed.includes(user.franchiseId)) throw new Error("You have already passed on this player.");
  if (lot.currentBidderId === user.franchiseId) throw new Error("You already hold the highest bid.");
  const rules = parseRules(session.rulesJson);
  const base = lotBase(session, lot);
  const amount = nextBidAmount(lot.currentBid, base);
  const err = validatePurchase(user, lot.player, amount, rules);
  if (err) throw new Error(err);
  await applyBid(session, lot, user.franchiseId, amount);
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "BIDDING", hammerCount: 0 } });
  return tickAuction(sessionId, { forceAi: true });
}

function validatePurchase(
  team: FullSession["teams"][number],
  player: FullSession["lots"][number]["player"],
  amount: number,
  rules: AuctionRules,
): string | null {
  if (team.members.length >= rules.maxSquadSize) return "You cannot bid because your squad is full.";
  if (player.isOverseas && team.overseasCount >= rules.maxOverseasPlayers) {
    return "Maximum overseas player limit reached.";
  }
  if (player.isOverseas && rules.overseasMaxFee != null && amount > rules.overseasMaxFee) {
    return "Overseas players are capped at the maximum overseas fee in this auction.";
  }
  if (!canAfford(team.purse, amount, team.members.length, rules)) {
    return "Unable to place bid. Your purse is insufficient (including minimum squad reserve).";
  }
  return null;
}

async function applyBid(session: FullSession, lot: FullSession["lots"][number], teamId: string, amount: number) {
  const team = session.teams.find((t) => t.franchiseId === teamId)!;
  await prisma.bid.create({
    data: { sessionId: session.id, lotId: lot.id, playerId: lot.playerId, teamId, amount },
  });
  await prisma.auctionLot.update({
    where: { id: lot.id },
    data: { currentBid: amount, currentBidderId: teamId },
  });
  await addEvent(session.id, "BID", commentaryFor({ type: "BID", teamName: team.franchise.shortName, amount }), {
    playerId: lot.playerId,
    teamId,
    amount,
  });
}

async function load(id: string) {
  const session = await prisma.auctionSession.findUnique({ where: { id }, include: includeSession });
  if (!session) throw new Error("Auction not found.");
  return session;
}

export async function tickAuction(sessionId: string, opts?: { forceAi?: boolean }) {
  const session = await load(sessionId);
  if (session.status !== "LIVE") return decorate(session);
  if (session.phase === "INTRO" || session.phase === "SOLD" || session.phase === "UNSOLD") return decorate(session);
  const lot = session.lots[session.currentLotIndex];
  if (!lot || lot.status !== "LIVE") return decorate(session);

  const rules = parseRules(session.rulesJson);
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { tickCount: { increment: 1 } } });
  const rng = mulberry32(session.seed + session.currentLotIndex * 997 + session.tickCount * 7919 + lot.currentBid);
  const passed = JSON.parse(lot.passedTeamIds) as string[];
  const user = session.teams.find((t) => t.isUser)!;
  const userOut = passed.includes(user.franchiseId);
  // After an AI bid the user decides; once the user leads (or has passed) the AI side keeps moving.
  const waitingOnUser =
    !userOut &&
    !opts?.forceAi &&
    session.phase === "BIDDING" &&
    lot.currentBidderId != null &&
    lot.currentBidderId !== user.franchiseId;
  if (waitingOnUser) return decorate(session);

  const aiTeams = shuffle(
    session.teams.filter((t) => !t.isUser && !passed.includes(t.franchiseId)),
    rng,
  );
  // Nobody has bid and every rival has stepped away: only the user can open the bidding.
  if (!userOut && lot.currentBidderId == null && aiTeams.length === 0 && !opts?.forceAi) return decorate(session);

  let acted = false;
  let passedChanged = false;
  for (const t of aiTeams) {
    if (lot.currentBidderId === t.franchiseId) continue;
    const view = toAiTeam(t);
    const player = toPlayerView(lot.player, lotBase(session, lot));
    const max = aiMaxBid(session, t, lot, rules, rng);
    const decision = decideBid(view, player, lot.currentBid, lot.currentBidderId, max, rules, rng);
    if (decision.decision === "PASS") {
      passed.push(t.franchiseId);
      passedChanged = true;
      if (rng() < 0.35) {
        await addEvent(session.id, "PASS", commentaryFor({ type: "PASS", teamName: t.franchise.shortName }), {
          playerId: lot.playerId,
          teamId: t.franchiseId,
        });
      }
      continue;
    }
    if (decision.decision === "WAIT") continue;
    if (decision.amount) {
      const err = validatePurchase(t, lot.player, decision.amount, rules);
      if (err) {
        passed.push(t.franchiseId);
        passedChanged = true;
        continue;
      }
      await applyBid(session, lot, t.franchiseId, decision.amount);
      acted = true;
      break;
    }
  }
  if (passedChanged) {
    await prisma.auctionLot.update({ where: { id: lot.id }, data: { passedTeamIds: JSON.stringify(passed) } });
  }

  const refreshed = await load(sessionId);
  const liveLot = refreshed.lots[refreshed.currentLotIndex];
  const passedNow = JSON.parse(liveLot.passedTeamIds) as string[];
  const nextAmount = nextBidAmount(liveLot.currentBid, lotBase(refreshed, liveLot));
  const interested = refreshed.teams.filter((t) => {
    if (passedNow.includes(t.franchiseId)) return false;
    return !validatePurchase(t, liveLot.player, nextAmount, rules);
  });

  if (acted) {
    await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "BIDDING", hammerCount: 0 } });
    return getSession(sessionId);
  }

  const someoneBid = liveLot.currentBidderId != null;
  if (!someoneBid) {
    // No hammer without a bid: keep the floor open until somebody opens or everybody is out.
    if (interested.length === 0) return markUnsold(refreshed, liveLot);
    return getSession(sessionId);
  }

  const hammer = refreshed.hammerCount + 1;
  if (hammer === 1) {
    await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "HAMMER", hammerCount: 1 } });
    await addEvent(sessionId, "GOING_ONCE", "Going once...", { playerId: liveLot.playerId });
    return getSession(sessionId);
  }
  if (hammer === 2) {
    await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "HAMMER", hammerCount: 2 } });
    await addEvent(sessionId, "GOING_TWICE", "Going twice...", { playerId: liveLot.playerId });
    return getSession(sessionId);
  }
  return markSold(refreshed, liveLot);
}

async function markSold(session: FullSession, lot: FullSession["lots"][number]) {
  const teamId = lot.currentBidderId!;
  const team = session.teams.find((t) => t.franchiseId === teamId)!;
  const price = lot.currentBid;
  await prisma.$transaction([
    prisma.auctionLot.update({
      where: { id: lot.id },
      data: { status: "SOLD", soldPrice: price, soldTeamId: teamId },
    }),
    prisma.sessionSquadMember.create({
      data: { sessionTeamId: team.id, playerId: lot.playerId, price, source: "auction" },
    }),
    prisma.sessionTeam.update({
      where: { id: team.id },
      data: {
        purse: team.purse - price,
        overseasCount: team.overseasCount + (lot.player.isOverseas ? 1 : 0),
      },
    }),
  ]);
  await addEvent(session.id, "PLAYER_SOLD", commentaryFor({ type: "PLAYER_SOLD", playerName: lot.player.name, teamName: team.franchise.shortName, amount: price }), {
    playerId: lot.playerId,
    teamId,
    amount: price,
  });
  await prisma.auctionSession.update({ where: { id: session.id }, data: { phase: "SOLD", hammerCount: 0 } });
  return getSession(session.id);
}

async function markUnsold(session: FullSession, lot: FullSession["lots"][number]) {
  await prisma.auctionLot.update({ where: { id: lot.id }, data: { status: "UNSOLD" } });
  await addEvent(session.id, "PLAYER_UNSOLD", commentaryFor({ type: "PLAYER_UNSOLD", playerName: lot.player.name }), {
    playerId: lot.playerId,
  });
  await prisma.auctionSession.update({ where: { id: session.id }, data: { phase: "UNSOLD", hammerCount: 0 } });
  return getSession(session.id);
}

export async function nextPlayer(sessionId: string) {
  const session = await load(sessionId);
  if (session.status !== "LIVE") throw new Error("Auction already completed.");
  if (session.phase !== "SOLD" && session.phase !== "UNSOLD") {
    throw new Error("Finish the current player before continuing.");
  }
  const nextIndex = session.currentLotIndex + 1;
  if (nextIndex >= session.lots.length) {
    const unsold = session.lots.filter((l) => l.status === "UNSOLD");
    if (unsold.length && !session.lots.some((l) => l.setCode === "ACCEL")) {
      return startAccelerated(session, unsold);
    }
    await prisma.auctionSession.update({ where: { id: sessionId }, data: { status: "COMPLETE", phase: "COMPLETE" } });
    return getSession(sessionId);
  }
  const next = session.lots[nextIndex];
  const setChanged = next.setCode !== session.lots[session.currentLotIndex].setCode;
  await prisma.auctionLot.update({ where: { id: next.id }, data: { status: "LIVE" } });
  await prisma.auctionSession.update({
    where: { id: sessionId },
    data: { currentLotIndex: nextIndex, phase: "INTRO", hammerCount: 0 },
  });
  if (setChanged) {
    await addEvent(sessionId, "SET_STARTED", `Set ${SETS.find((s) => s.code === next.setCode)?.name ?? next.setCode} begins.`);
  }
  await addEvent(
    sessionId,
    "PLAYER_STARTED",
    commentaryFor({
      type: "PLAYER_STARTED",
      playerName: next.player.name,
      amount: session.mode === "mini" ? next.player.basePrice : next.player.megaBasePrice,
    }),
    { playerId: next.playerId },
  );
  return getSession(sessionId);
}

async function startAccelerated(session: FullSession, unsold: FullSession["lots"]) {
  const start = session.lots.length;
  await prisma.$transaction([
    // Round-1 rows are retired so each returning player has exactly one active lot.
    prisma.auctionLot.updateMany({ where: { id: { in: unsold.map((l) => l.id) } }, data: { status: "RETURNED" } }),
    prisma.auctionLot.createMany({
      data: unsold.map((lot, i) => ({
        sessionId: session.id,
        playerId: lot.playerId,
        orderIndex: start + i,
        setCode: "ACCEL",
        status: i === 0 ? "LIVE" : "PENDING",
        currentBid: 0,
        passedTeamIds: "[]",
      })),
    }),
    prisma.auctionSession.update({
      where: { id: session.id },
      data: { currentLotIndex: start, phase: "INTRO", hammerCount: 0 },
    }),
  ]);
  await addEvent(session.id, "SET_STARTED", "Accelerated round — unsold players return.");
  const first = unsold[0];
  await addEvent(
    session.id,
    "PLAYER_STARTED",
    commentaryFor({ type: "PLAYER_STARTED", playerName: first.player.name, amount: session.mode === "mini" ? first.player.basePrice : first.player.megaBasePrice }),
    { playerId: first.playerId },
  );
  return getSession(session.id);
}

export const XI_SLOT_KEYS = ["open1", "open2", "three", "four", "five", "ar1", "ar2", "wk", "fast1", "fast2", "spin"];
export const XI_MAX_OVERSEAS = 4;

export async function saveXi(sessionId: string, slots: { slotKey: string; playerId: string | null; orderIndex: number }[]) {
  const session = await load(sessionId);
  const user = session.teams.find((t) => t.isUser)!;
  const squad = new Map(user.members.map((m) => [m.playerId, m.player]));
  const seen = new Set<string>();
  let overseas = 0;
  for (const s of slots) {
    if (!XI_SLOT_KEYS.includes(s.slotKey)) throw new Error(`Unknown XI slot "${s.slotKey}".`);
    if (!s.playerId) continue;
    const p = squad.get(s.playerId);
    if (!p) throw new Error("Playing XI can only include players from your squad.");
    if (seen.has(s.playerId)) throw new Error(`${p.name} is selected more than once.`);
    seen.add(s.playerId);
    if (p.isOverseas) overseas += 1;
  }
  if (overseas > XI_MAX_OVERSEAS) throw new Error(`A playing XI can include at most ${XI_MAX_OVERSEAS} overseas players.`);
  await prisma.$transaction([
    prisma.playingXiSlot.deleteMany({ where: { sessionId } }),
    prisma.playingXiSlot.createMany({ data: slots.map((s) => ({ sessionId, ...s })) }),
  ]);
  return getSession(sessionId);
}

export async function listPlayers(q: {
  search?: string;
  role?: string;
  overseas?: string;
  capped?: string;
  status?: string;
  sessionId?: string;
}) {
  await ensureCatalog();
  const players = await prisma.player.findMany({ where: { seasonId: "ipl-2026" }, orderBy: { name: "asc" } });
  let lots: { playerId: string; status: string; soldPrice: number | null; soldTeamId: string | null }[] = [];
  if (q.sessionId) {
    lots = await prisma.auctionLot.findMany({
      where: { sessionId: q.sessionId },
      select: { playerId: true, status: true, soldPrice: true, soldTeamId: true },
    });
  }
  const lotMap = new Map(lots.map((l) => [l.playerId, l]));
  return players
    .map((p) => ({ ...p, ratings: gameRatings(p), lot: lotMap.get(p.id) ?? null }))
    .filter((p) => {
      if (q.search && !p.name.toLowerCase().includes(q.search.toLowerCase())) return false;
      if (q.role && p.role !== q.role) return false;
      if (q.overseas === "yes" && !p.isOverseas) return false;
      if (q.overseas === "no" && p.isOverseas) return false;
      if (q.capped === "yes" && !p.capped) return false;
      if (q.capped === "no" && p.capped) return false;
      if (q.status && (!p.lot || p.lot.status !== q.status)) return false;
      return true;
    });
}

const ROLES = ["BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"];

export async function importCsv(csv: string) {
  const rows = parseCsv(csv);
  const header = (rows.shift() ?? []).map((h) => h.trim());
  const errors: string[] = [];
  let ok = 0;
  for (const required of ["name", "role", "basePrice"]) {
    if (!header.includes(required)) errors.push(`Missing required column "${required}".`);
  }
  if (errors.length) return { ok, errors };
  const seasonId = await ensureCatalog();
  const setCodes = new Set(SETS.map((s) => s.code));
  const ids = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.every((c) => !c.trim())) continue;
    const rowNo = i + 2;
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => (rec[h] = (cols[idx] ?? "").trim()));
    const name = rec.name;
    if (!name) {
      errors.push(`Row ${rowNo}: Invalid player (missing name)`);
      continue;
    }
    const id = rec.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (ids.has(id)) {
      errors.push(`Row ${rowNo}: Duplicate player ${id}`);
      continue;
    }
    ids.add(id);
    const role = rec.role.toUpperCase();
    if (!ROLES.includes(role)) {
      errors.push(`Row ${rowNo}: Missing/invalid role for ${name}`);
      continue;
    }
    const base = Number(rec.basePrice);
    if (!Number.isInteger(base) || base <= 0) {
      errors.push(`Row ${rowNo}: Invalid price for ${name}`);
      continue;
    }
    const megaBase = rec.megaBasePrice ? Number(rec.megaBasePrice) : base;
    if (!Number.isInteger(megaBase) || megaBase <= 0) {
      errors.push(`Row ${rowNo}: Invalid mega base price for ${name}`);
      continue;
    }
    const country = rec.country || rec.nationality;
    if (!country) {
      errors.push(`Row ${rowNo}: Invalid nationality for ${name}`);
      continue;
    }
    const setCode = rec.setCode || "IU";
    if (!setCodes.has(setCode) || setCode === "ACCEL") {
      errors.push(`Row ${rowNo}: Unknown set code "${setCode}" for ${name}`);
      continue;
    }
    const data = {
      name,
      shortName: rec.shortName || name.split(" ").slice(-1)[0],
      country,
      role,
      isOverseas: rec.isOverseas ? rec.isOverseas.toLowerCase() === "true" : country !== "India",
      capped: rec.capped.toLowerCase() === "true",
      basePrice: base,
      megaBasePrice: megaBase,
      setCode,
      acquisition: rec.acquisition || "auction",
      statsSource: rec.statsSource || "csv-import",
    };
    try {
      await prisma.player.upsert({
        where: { id },
        update: data,
        create: { id, seasonId, ...data },
      });
      ok += 1;
    } catch (e) {
      errors.push(`Row ${rowNo}: ${e instanceof Error ? e.message : "import failed"}`);
    }
  }
  return { ok, errors };
}

/** RFC-4180-style parser: quoted fields, escaped "" quotes, commas and newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "").trim();
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  row.push(cur);
  rows.push(row);
  return rows;
}

export async function latestSession() {
  return prisma.auctionSession.findFirst({ orderBy: { updatedAt: "desc" } });
}
