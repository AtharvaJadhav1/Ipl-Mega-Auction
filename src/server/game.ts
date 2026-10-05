import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import { FRANCHISES } from "@/data/franchises";
import { PLAYER_SEEDS, SETS, type PlayerSeed } from "@/data/players";
import { baseValue, computeMaxBid, decideBid, MAX_PLAYER_PRICE, mulberry32, roleNeed, type AiTeamView, type PlayerView } from "@/engine/ai";
import { canAfford, nextBidAmount } from "@/engine/bids";
import { commentaryFor } from "@/engine/commentary";
import { gameRatings } from "@/engine/ratings";
import { DEFAULT_RULES, parseRules, type AuctionRules } from "@/engine/rules";
import { aiRetentionPicks, CAPPED_SLABS, MAX_CAPPED_RETAINED, MAX_RETAINED, MAX_UNCAPPED_RETAINED, planRetention, rtmCardsAfterRetention, UNCAPPED_SLAB } from "@/engine/retention";
import { areRivals, franchiseGaps } from "@/engine/strategy";
import { evaluateTrade } from "@/engine/trade";
import { formatINR } from "@/lib/money";
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

function toAiTeam(t: FullSession["teams"][number], session?: FullSession): AiTeamView {
  const lostIds = JSON.parse(t.lostPlayerIds || "[]") as string[];
  const roleOf = new Map(session?.lots.map((l) => [l.playerId, l.player.role]) ?? []);
  return {
    franchiseId: t.franchiseId,
    personality: t.franchise.personality as AiTeamView["personality"],
    purse: t.purse,
    initialPurse: t.initialPurse,
    squadSize: t.members.length,
    overseasCount: t.overseasCount,
    roleCounts: roleCounts(t.members),
    isUser: t.isUser,
    gaps: franchiseGaps(t.franchiseId),
    grudge: t.grudge,
    lostRoles: lostIds.map((id) => roleOf.get(id)).filter((r): r is string => !!r),
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

async function createLots(sessionId: string, mode: string, seed: number, exclude: Set<string>) {
  const rng = mulberry32(seed);
  const pool = poolForMode(mode).filter((p) => !exclude.has(p.id));
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
      commentaryFor({ type: "PLAYER_STARTED", playerName: first.player.name, amount: mode === "mini" ? first.player.basePrice : first.player.megaBasePrice }),
      { playerId: first.playerId },
    );
  }
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
  name?: string;
}) {
  const seasonId = await ensureCatalog();
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const challenge = CHALLENGES.find((c) => c.id === input.challengeId);
  const custom = input.mode === "custom";
  const mini = input.mode === "mini";
  const mega = input.mode === "mega";
  const rules: AuctionRules = {
    ...DEFAULT_RULES,
    maxOverseasPlayers:
      input.challengeId === "overseas-tight" ? 4 : custom ? input.maxOverseas ?? DEFAULT_RULES.maxOverseasPlayers : DEFAULT_RULES.maxOverseasPlayers,
    salaryCap: challenge?.purse ?? (custom ? input.customPurse : undefined) ?? DEFAULT_RULES.salaryCap,
    // The overseas fee cap only applies in the real 2026 mini-auction.
    overseasMaxFee: mini ? DEFAULT_RULES.overseasMaxFee : null,
  };
  const userFranchise = FRANCHISES.find((f) => f.id === input.userFranchiseId);
  const defaultName = `${userFranchise?.shortName ?? input.userFranchiseId.toUpperCase()} · ${input.mode} · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  const sessionId = crypto.randomUUID();
  try {
    await prisma.auctionSession.create({
      data: {
        id: sessionId,
        seasonId,
        name: input.name?.trim() || defaultName,
        mode: input.mode,
        difficulty: input.difficulty,
        speed: input.speed,
        userFranchiseId: input.userFranchiseId,
        status: "LIVE",
        // Mega auctions open with the retention window; other modes go straight to the first lot.
        phase: mega ? "RETENTION" : "INTRO",
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
          // Mini auctions grant one Right to Match card; mega cards are set when retention is confirmed.
          rtmCards: mini ? 1 : 0,
          members: {
            create: retained.map((p) => ({ playerId: p.id, price: 0, source: p.acquisition })),
          },
        },
      });
    }

    if (!mega) await createLots(sessionId, input.mode, seed, new Set());
  } catch (e) {
    await prisma.auctionSession.deleteMany({ where: { id: sessionId } });
    throw e;
  }

  return getSession(sessionId);
}

/** Mega-auction retention: the user's picks plus automatic AI retentions, then the player pool is built. */
export async function confirmRetention(sessionId: string, pickIds: string[]) {
  const session = await load(sessionId);
  if (session.status !== "LIVE" || session.phase !== "RETENTION") throw new Error("The retention window is not open.");
  const rules = parseRules(session.rulesJson);
  const user = session.teams.find((t) => t.isUser)!;
  const byId = new Map(PLAYER_SEEDS.map((p) => [p.id, p]));

  const userPicks: PlayerSeed[] = [];
  for (const id of pickIds) {
    const p = byId.get(id);
    if (!p || p.actual2026TeamId !== user.franchiseId) throw new Error("You can only retain players from your own 2026 squad.");
    userPicks.push(p);
  }
  const userPlan = planRetention(userPicks, { maxOverseas: rules.maxOverseasPlayers });
  if (userPlan.error) throw new Error(userPlan.error);
  const reserve = Math.max(0, rules.minSquadSize - userPicks.length) * rules.minPlayerPrice;
  if (userPlan.total + reserve > user.purse) throw new Error("Those retentions leave too little purse for a minimum squad.");

  const plans = [{ team: user, picks: userPicks, costs: userPlan.costs }];
  for (const t of session.teams.filter((x) => !x.isUser)) {
    const ranked = PLAYER_SEEDS.filter((p) => p.actual2026TeamId === t.franchiseId).sort(
      (a, b) => gameRatings(b).overall - gameRatings(a).overall,
    );
    const picks = aiRetentionPicks(ranked, t.franchise.personality, { maxOverseas: rules.maxOverseasPlayers, purse: t.purse });
    plans.push({ team: t, picks, costs: planRetention(picks, { maxOverseas: rules.maxOverseasPlayers }).costs });
  }

  await prisma.$transaction(
    plans.flatMap(({ team, picks, costs }) => [
      prisma.sessionSquadMember.createMany({
        data: picks.map((p, i) => ({ sessionTeamId: team.id, playerId: p.id, price: costs[i], source: "retained" })),
      }),
      prisma.sessionTeam.update({
        where: { id: team.id },
        data: {
          purse: team.purse - costs.reduce((a, b) => a + b, 0),
          overseasCount: picks.filter((p) => p.isOverseas).length,
          rtmCards: rtmCardsAfterRetention(picks.length),
        },
      }),
    ]),
  );

  for (const { team, picks } of plans) {
    await addEvent(
      sessionId,
      "RETENTION",
      picks.length
        ? `${team.franchise.shortName} retain ${picks.map((p) => p.shortName).join(", ")}.`
        : `${team.franchise.shortName} retain no one and go in with ${rtmCardsAfterRetention(0)} RTM cards.`,
      { teamId: team.franchiseId },
    );
  }

  const retainedIds = new Set(plans.flatMap((p) => p.picks.map((x) => x.id)));
  await createLots(sessionId, session.mode, session.seed, retainedIds);
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "INTRO", currentLotIndex: 0, hammerCount: 0 } });
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

/** While set, `decorate` returns an empty stub: internal loops (skip) don't need the heavy client payload per tick. */
const quietMode = new AsyncLocalStorage<boolean>();

export function decorate(session: FullSession) {
  if (quietMode.getStore()) return {} as never;
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

  const rtmTeam = session.phase === "RTM" && lot?.rtmTeamId ? session.teams.find((t) => t.franchiseId === lot.rtmTeamId) : null;
  const rtmPending = rtmTeam && lot
    ? {
        teamId: rtmTeam.franchiseId,
        shortName: rtmTeam.franchise.shortName,
        price: lot.currentBid,
        winnerId: lot.currentBidderId,
        isUser: rtmTeam.isUser,
        canMatch: rtmTeam.isUser ? !validatePurchase(rtmTeam, lot.player, lot.currentBid, rules) : false,
      }
    : null;
  // Which franchise could still use RTM on the player on the block (shown as a hint to the user).
  const rtmHint =
    lot && lot.setCode !== "ACCEL" && lot.player.actual2026TeamId
      ? (() => {
          const t = session.teams.find((x) => x.franchiseId === lot.player.actual2026TeamId);
          return t && t.rtmCards > 0 ? { teamId: t.franchiseId, shortName: t.franchise.shortName, cards: t.rtmCards } : null;
        })()
      : null;

  const retention =
    session.phase === "RETENTION"
      ? {
          candidates: PLAYER_SEEDS.filter((p) => p.actual2026TeamId === user.franchiseId)
            .map((p) => ({
              id: p.id,
              name: p.name,
              role: p.role,
              capped: p.capped,
              isOverseas: p.isOverseas,
              age: p.age,
              overall: gameRatings(p).overall,
              price2026: p.actual2026Price,
            }))
            .sort((a, b) => b.overall - a.overall),
          slabs: {
            capped: CAPPED_SLABS,
            uncapped: UNCAPPED_SLAB,
            max: MAX_RETAINED,
            maxCapped: MAX_CAPPED_RETAINED,
            maxUncapped: MAX_UNCAPPED_RETAINED,
          },
        }
      : null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { seed: _seed, ...publicSession } = session;
  return {
    ...publicSession,
    rtmPending,
    rtmHint,
    retention,
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

const moneyRatioCache = new WeakMap<FullSession, number | undefined>();

/** Purse still in the room versus what the players the room still needs are likely to cost. */
function roomMoneyRatio(session: FullSession, rules: AuctionRules): number | undefined {
  if (moneyRatioCache.has(session)) return moneyRatioCache.get(session);
  const pending = session.lots.filter((l) => l.status === "PENDING" || l.status === "LIVE");
  const need = session.teams.reduce((sum, t) => sum + Math.max(0, rules.minSquadSize - t.members.length), 0);
  const n = Math.min(pending.length, Math.ceil(need * 1.1));
  let ratio: number | undefined;
  if (n > 0) {
    const demand = pending
      .map((l) => baseValue(toPlayerView(l.player, lotBase(session, l))))
      .sort((a, b) => b - a)
      .slice(0, n)
      .reduce((a, b) => a + b, 0);
    const roomPurse = session.teams.filter((t) => t.members.length < rules.maxSquadSize).reduce((a, t) => a + t.purse, 0);
    ratio = roomPurse / Math.max(1, demand * MARKET_DEMAND_SCALE);
  }
  moneyRatioCache.set(session, ratio);
  return ratio;
}

const MARKET_DEMAND_SCALE = 0.55;

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
    roomMoneyRatio: roomMoneyRatio(session, rules),
  };
}

/** The AI's real ceiling for a lot, including aggression, rivalry, memory and market effects. Used by ticks and the intel panel. */
function aiMaxBid(session: FullSession, team: FullSession["teams"][number], lot: FullSession["lots"][number], rules: AuctionRules, rng: () => number) {
  const leader = lot.currentBidderId;
  const user = session.teams.find((t) => t.isUser);
  const ctx = {
    ...marketCtx(session, lot, rules, rng),
    leaderIsUser: !!leader && leader === user?.franchiseId,
    rivalLeader: !!leader && areRivals(team.franchiseId, leader),
  };
  const max = computeMaxBid(toAiTeam(team, session), toPlayerView(lot.player, lotBase(session, lot)), ctx, rules);
  return Math.min(MAX_PLAYER_PRICE, Math.round(max * (0.85 + (session.aiAggression / 100) * 0.35)));
}

function lotBase(session: FullSession, lot: FullSession["lots"][number]) {
  return session.mode === "mini" ? lot.player.basePrice : lot.player.megaBasePrice;
}

export async function startBidding(sessionId: string) {
  const session = await load(sessionId);
  if (session.status !== "LIVE" || session.phase !== "INTRO") {
    return decorate(session);
  }
  if (session.paused) throw new Error("The auction is paused.");
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "BIDDING", hammerCount: 0 } });
  return getSession(sessionId);
}

export async function placeUserBid(sessionId: string, kind: "increment" | "pass") {
  const session = await load(sessionId);
  if (session.status !== "LIVE") throw new Error("Auction already completed.");
  if (session.paused) throw new Error("The auction is paused.");
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
    return getSession(sessionId);
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
  return getSession(sessionId);
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
  const previous = lot.currentBidderId;
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

  // Rivals with memory: being outbid by the user builds resentment.
  if (team.isUser && previous && previous !== teamId) {
    const victim = session.teams.find((t) => t.franchiseId === previous);
    if (victim && !victim.isUser) {
      const grudge = Math.min(6, victim.grudge + 1);
      await prisma.sessionTeam.update({ where: { id: victim.id }, data: { grudge } });
      if (grudge === 3) {
        await addEvent(session.id, "GRUDGE", `${victim.franchise.shortName} are tired of being outbid by you and will push harder.`, { teamId: victim.franchiseId });
      }
    }
  }

  // Paddle war: two teams trading blows.
  const recent = await prisma.bid.findMany({ where: { lotId: lot.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 4 });
  if (recent.length === 4) {
    const [a, b, c, d] = recent.map((r) => r.teamId);
    if (a !== b && a === c && b === d) {
      const already = await prisma.auctionEvent.count({ where: { sessionId: session.id, type: "PADDLE_WAR", playerId: lot.playerId } });
      if (!already) {
        const nameOf = (id: string) => session.teams.find((t) => t.franchiseId === id)?.franchise.shortName ?? id;
        await addEvent(session.id, "PADDLE_WAR", `Paddle war! ${nameOf(a)} and ${nameOf(b)} refuse to back down.`, { playerId: lot.playerId });
      }
    }
  }
}

async function load(id: string) {
  const session = await prisma.auctionSession.findUnique({ where: { id }, include: includeSession });
  if (!session) throw new Error("Auction not found.");
  return session;
}

export async function tickAuction(sessionId: string) {
  const session = await load(sessionId);
  if (session.status !== "LIVE" || session.paused) return decorate(session);
  if (session.phase === "INTRO" || session.phase === "SOLD" || session.phase === "UNSOLD" || session.phase === "RETENTION") return decorate(session);
  const lot = session.lots[session.currentLotIndex];
  if (!lot || lot.status !== "LIVE") return decorate(session);

  const rules = parseRules(session.rulesJson);
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { tickCount: { increment: 1 } } });
  if (session.phase === "RTM") return aiRtmTick(session, lot, rules);
  const rng = mulberry32(session.seed + session.currentLotIndex * 997 + session.tickCount * 7919 + lot.currentBid);
  const passed = JSON.parse(lot.passedTeamIds) as string[];
  const user = session.teams.find((t) => t.isUser)!;
  const userOut = passed.includes(user.franchiseId);
  // The floor never waits for the user: rivals keep bidding (and the hammer keeps falling) whether or not the user acts.
  const aiTeams = shuffle(
    session.teams.filter((t) => !t.isUser && !passed.includes(t.franchiseId)),
    rng,
  );
  // Nobody has bid and every rival has stepped away: only the user can open the bidding.
  if (!userOut && lot.currentBidderId == null && aiTeams.length === 0) return decorate(session);

  let acted = false;
  let passedChanged = false;
  for (const t of aiTeams) {
    if (lot.currentBidderId === t.franchiseId) continue;
    const view = toAiTeam(t, session);
    const player = toPlayerView(lot.player, lotBase(session, lot));
    const max = aiMaxBid(session, t, lot, rules, rng);
    const decision = decideBid(view, player, lot.currentBid, lot.currentBidderId, max, rules, rng, {
      leaderIsUser: lot.currentBidderId === user.franchiseId,
    });
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
  return concludeSale(refreshed, liveLot, rules);
}

function rtmCandidate(session: FullSession, lot: FullSession["lots"][number], rules: AuctionRules) {
  const previousId = lot.player.actual2026TeamId;
  if (!previousId || lot.setCode === "ACCEL" || lot.rtmTeamId || previousId === lot.currentBidderId) return null;
  const team = session.teams.find((t) => t.franchiseId === previousId);
  if (!team || team.rtmCards <= 0) return null;
  if (validatePurchase(team, lot.player, lot.currentBid, rules)) return null;
  return team;
}

async function concludeSale(session: FullSession, lot: FullSession["lots"][number], rules: AuctionRules) {
  const rtm = rtmCandidate(session, lot, rules);
  if (!rtm) return markSold(session, lot);
  await prisma.auctionLot.update({ where: { id: lot.id }, data: { rtmTeamId: rtm.franchiseId } });
  await prisma.auctionSession.update({ where: { id: session.id }, data: { phase: "RTM", hammerCount: 0 } });
  await addEvent(
    session.id,
    "RTM_AVAILABLE",
    `${rtm.franchise.shortName} hold the Right to Match on ${lot.player.name} at ${formatINR(lot.currentBid)}.`,
    { playerId: lot.playerId, teamId: rtm.franchiseId, amount: lot.currentBid },
  );
  return getSession(session.id);
}

async function aiRtmTick(session: FullSession, lot: FullSession["lots"][number], rules: AuctionRules) {
  const team = session.teams.find((t) => t.franchiseId === lot.rtmTeamId);
  if (!team) return markSold(session, lot);
  if (team.isUser) return decorate(session);
  const rng = mulberry32(session.seed + session.currentLotIndex * 31 + session.tickCount);
  const max = aiMaxBid(session, team, lot, rules, rng);
  return finishRtm(session, lot, team, lot.currentBid <= max && !validatePurchase(team, lot.player, lot.currentBid, rules));
}

async function finishRtm(session: FullSession, lot: FullSession["lots"][number], team: FullSession["teams"][number], match: boolean) {
  if (match) {
    await addEvent(
      session.id,
      "RTM_MATCHED",
      `RTM! ${team.franchise.shortName} match ${formatINR(lot.currentBid)} and keep ${lot.player.name}.`,
      { playerId: lot.playerId, teamId: team.franchiseId, amount: lot.currentBid },
    );
    return markSold(session, lot, { buyerId: team.franchiseId, viaRtm: true });
  }
  await addEvent(session.id, "RTM_DECLINED", `${team.franchise.shortName} decline to match for ${lot.player.name}.`, {
    playerId: lot.playerId,
    teamId: team.franchiseId,
  });
  return markSold(session, lot);
}

export async function userRtm(sessionId: string, action: "match" | "decline") {
  const session = await load(sessionId);
  if (session.status !== "LIVE") throw new Error("Auction already completed.");
  if (session.paused) throw new Error("The auction is paused.");
  if (session.phase !== "RTM") throw new Error("No Right to Match decision is pending.");
  const lot = session.lots[session.currentLotIndex];
  const user = session.teams.find((t) => t.isUser)!;
  if (!lot || lot.rtmTeamId !== user.franchiseId) throw new Error("The Right to Match belongs to another franchise.");
  if (action === "match") {
    const err = validatePurchase(user, lot.player, lot.currentBid, parseRules(session.rulesJson));
    if (err) throw new Error(err);
  }
  return finishRtm(session, lot, user, action === "match");
}

async function markSold(session: FullSession, lot: FullSession["lots"][number], opts?: { buyerId?: string; viaRtm?: boolean }) {
  const teamId = opts?.buyerId ?? lot.currentBidderId!;
  const team = session.teams.find((t) => t.franchiseId === teamId)!;
  const price = lot.currentBid;
  await prisma.$transaction([
    prisma.auctionLot.update({
      where: { id: lot.id },
      data: { status: "SOLD", soldPrice: price, soldTeamId: teamId },
    }),
    prisma.sessionSquadMember.create({
      data: { sessionTeamId: team.id, playerId: lot.playerId, price, source: opts?.viaRtm ? "rtm" : "auction" },
    }),
    prisma.sessionTeam.update({
      where: { id: team.id },
      data: {
        purse: team.purse - price,
        overseasCount: team.overseasCount + (lot.player.isOverseas ? 1 : 0),
        rtmCards: opts?.viaRtm ? team.rtmCards - 1 : team.rtmCards,
      },
    }),
  ]);
  const sold = commentaryFor({ type: "PLAYER_SOLD", playerName: lot.player.name, teamName: team.franchise.shortName, amount: price });
  await addEvent(session.id, "PLAYER_SOLD", opts?.viaRtm ? `${sold} (via RTM)` : sold, {
    playerId: lot.playerId,
    teamId,
    amount: price,
  });

  // Rivals with memory: the runner-up resents losing the player to the user and goes after that role again.
  if (team.isUser && !opts?.viaRtm) {
    const bids = await prisma.bid.findMany({ where: { lotId: lot.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    const runnerUpId = bids.find((b) => b.teamId !== teamId)?.teamId;
    const runnerUp = session.teams.find((t) => t.franchiseId === runnerUpId);
    if (runnerUp && !runnerUp.isUser) {
      const lost = JSON.parse(runnerUp.lostPlayerIds || "[]") as string[];
      lost.push(lot.playerId);
      await prisma.sessionTeam.update({
        where: { id: runnerUp.id },
        data: { lostPlayerIds: JSON.stringify(lost), grudge: Math.min(6, runnerUp.grudge + 1) },
      });
      await addEvent(session.id, "REVENGE", `${runnerUp.franchise.shortName} lose ${lot.player.name} to you and want revenge.`, { teamId: runnerUp.franchiseId });
    }
  }

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

/**
 * Skips the player on the block: the user steps out and the room plays the lot to its conclusion at once,
 * so the result (price and buyer, or unsold) can be shown instead of the lot silently disappearing.
 */
export async function skipPlayer(sessionId: string) {
  const session = await load(sessionId);
  if (session.status !== "LIVE") throw new Error("Auction already completed.");
  if (session.paused) throw new Error("The auction is paused.");
  if (session.phase === "RETENTION") throw new Error("Finish the retention window first.");
  if (session.phase === "SOLD" || session.phase === "UNSOLD") throw new Error("This player is already resolved.");
  const lot = session.lots[session.currentLotIndex];
  if (!lot || lot.status !== "LIVE") throw new Error("Player is no longer available.");
  const user = session.teams.find((t) => t.isUser)!;

  const passed = JSON.parse(lot.passedTeamIds) as string[];
  if (lot.currentBidderId !== user.franchiseId && !passed.includes(user.franchiseId)) {
    passed.push(user.franchiseId);
    await prisma.auctionLot.update({ where: { id: lot.id }, data: { passedTeamIds: JSON.stringify(passed) } });
  }
  await addEvent(sessionId, "PLAYER_SKIPPED", `You skip ${lot.player.name}; the room decides.`, { playerId: lot.playerId, teamId: user.franchiseId });
  if (session.phase === "INTRO") {
    await prisma.auctionSession.update({ where: { id: sessionId }, data: { phase: "BIDDING", hammerCount: 0 } });
  }

  for (let i = 0; i < 600; i++) {
    const cur = await load(sessionId);
    if (cur.phase === "SOLD" || cur.phase === "UNSOLD") break;
    const curLot = cur.lots[cur.currentLotIndex];
    await quietMode.run(true, async () => {
      if (cur.phase === "RTM" && curLot?.rtmTeamId === user.franchiseId) await userRtm(sessionId, "decline");
      else await tickAuction(sessionId);
    });
  }
  return getSession(sessionId);
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

export async function updateSettings(sessionId: string, patch: { speed?: string; paused?: boolean }) {
  await load(sessionId);
  await prisma.auctionSession.update({
    where: { id: sessionId },
    data: { ...(patch.speed ? { speed: patch.speed } : {}), ...(patch.paused != null ? { paused: patch.paused } : {}) },
  });
  return getSession(sessionId);
}

export async function renameSession(sessionId: string, name: string) {
  await load(sessionId);
  await prisma.auctionSession.update({ where: { id: sessionId }, data: { name: name.trim().slice(0, 60) || null } });
  return getSession(sessionId);
}

export async function deleteSession(sessionId: string) {
  await prisma.auctionSession.deleteMany({ where: { id: sessionId } });
}

export async function listSessions() {
  const sessions = await prisma.auctionSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: { teams: { where: { isUser: true }, include: { franchise: true, _count: { select: { members: true } } } } },
  });
  const counts = await prisma.auctionLot.groupBy({ by: ["sessionId", "status"], _count: { _all: true } });
  return sessions.map((s) => {
    const mine = counts.filter((c) => c.sessionId === s.id);
    const total = mine.filter((c) => c.status !== "RETURNED").reduce((a, c) => a + c._count._all, 0);
    const done = mine.filter((c) => ["SOLD", "UNSOLD", "SKIPPED"].includes(c.status)).reduce((a, c) => a + c._count._all, 0);
    const user = s.teams[0];
    return {
      id: s.id,
      name: s.name,
      mode: s.mode,
      difficulty: s.difficulty,
      status: s.status,
      phase: s.phase,
      challengeId: s.challengeId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      franchise: user ? { id: user.franchiseId, shortName: user.franchise.shortName, primary: user.franchise.primary, secondary: user.franchise.secondary } : null,
      squadSize: user?._count.members ?? 0,
      purse: user?.purse ?? 0,
      lotsDone: done,
      lotsTotal: total,
    };
  });
}

export async function listTrades(sessionId: string) {
  return prisma.trade.findMany({ where: { sessionId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}

/** Post-auction swap with an AI franchise. Contracts move with the players, so purses settle on the price difference. */
export async function proposeTrade(sessionId: string, partnerFranchiseId: string, offerIds: string[], requestIds: string[]) {
  const session = await load(sessionId);
  if (session.status !== "COMPLETE") throw new Error("The trading window opens once the auction is complete.");
  const rules = parseRules(session.rulesJson);
  const user = session.teams.find((t) => t.isUser)!;
  const partner = session.teams.find((t) => t.franchiseId === partnerFranchiseId && !t.isUser);
  if (!partner) throw new Error("Unknown trade partner.");
  if (!offerIds.length || !requestIds.length) throw new Error("Pick at least one player on each side.");
  if (offerIds.length > 5 || requestIds.length > 5) throw new Error("A trade can include at most 5 players per side.");
  if (new Set(offerIds).size !== offerIds.length || new Set(requestIds).size !== requestIds.length) throw new Error("A player was selected twice.");
  const offered = offerIds.map((id) => user.members.find((m) => m.playerId === id));
  const requested = requestIds.map((id) => partner.members.find((m) => m.playerId === id));
  if (offered.some((m) => !m)) throw new Error("You can only offer players from your own squad.");
  if (requested.some((m) => !m)) throw new Error("You can only request players from their squad.");
  const give = offered as NonNullable<(typeof offered)[number]>[];
  const get = requested as NonNullable<(typeof requested)[number]>[];

  const userSize = user.members.length - give.length + get.length;
  const partnerSize = partner.members.length - get.length + give.length;
  if (userSize > rules.maxSquadSize) throw new Error("That deal would put your squad over the size limit.");
  if (partnerSize > rules.maxSquadSize) throw new Error(`${partner.franchise.shortName} cannot take on that many players.`);
  const overseas = (list: { player: { isOverseas: boolean } }[]) => list.filter((m) => m.player.isOverseas).length;
  const userOverseas = user.overseasCount - overseas(give) + overseas(get);
  const partnerOverseas = partner.overseasCount - overseas(get) + overseas(give);
  if (userOverseas > rules.maxOverseasPlayers) throw new Error("That deal would breach your overseas limit.");
  if (partnerOverseas > rules.maxOverseasPlayers) throw new Error(`${partner.franchise.shortName} would breach their overseas limit.`);
  const priceOut = give.reduce((a, m) => a + m.price, 0);
  const priceIn = get.reduce((a, m) => a + m.price, 0);
  if (user.purse + priceOut - priceIn < 0) throw new Error("You cannot absorb that much salary.");
  if (partner.purse + priceIn - priceOut < 0) throw new Error(`${partner.franchise.shortName} cannot absorb that much salary.`);

  const view = toAiTeam(partner, session);
  const lite = (m: (typeof give)[number]) => ({ overall: gameRatings(m.player).overall, capped: m.player.capped, role: m.player.role, age: m.player.age });
  const verdict = evaluateTrade({
    give: give.map(lite),
    get: get.map(lite),
    personality: view.personality,
    needFor: (role) => roleNeed(view, role),
  });

  if (verdict.accepted) {
    await prisma.$transaction([
      prisma.sessionSquadMember.updateMany({ where: { id: { in: give.map((m) => m.id) } }, data: { sessionTeamId: partner.id, source: "trade" } }),
      prisma.sessionSquadMember.updateMany({ where: { id: { in: get.map((m) => m.id) } }, data: { sessionTeamId: user.id, source: "trade" } }),
      prisma.sessionTeam.update({ where: { id: user.id }, data: { purse: user.purse + priceOut - priceIn, overseasCount: userOverseas } }),
      prisma.sessionTeam.update({ where: { id: partner.id }, data: { purse: partner.purse + priceIn - priceOut, overseasCount: partnerOverseas } }),
      prisma.playingXiSlot.deleteMany({ where: { sessionId, playerId: { in: give.map((m) => m.playerId) } } }),
    ]);
  }
  await prisma.trade.create({
    data: {
      sessionId,
      partnerTeamId: partnerFranchiseId,
      offeredIds: JSON.stringify(offerIds),
      requestedIds: JSON.stringify(requestIds),
      accepted: verdict.accepted,
      message: verdict.message,
    },
  });
  return { accepted: verdict.accepted, message: verdict.message, ratio: verdict.ratio, session: await getSession(sessionId) };
}
