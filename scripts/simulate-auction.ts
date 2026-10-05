import { nextBidAmount } from "../src/engine/bids";
import { startAuction, startBidding, placeUserBid, tickAuction, nextPlayer, getSession } from "../src/server/game";

async function run() {
  const session = await startAuction({
    userFranchiseId: "rcb",
    mode: "quick",
    difficulty: "medium",
    speed: "instant",
    soundEnabled: false,
    aiAggression: 60,
  });
  if (!session) throw new Error("no session");
  const id = session.id;
  let sold = 0;
  let unsold = 0;
  const personalities = new Set<string>();

  for (let i = 0; i < 12; i++) {
    let s = await getSession(id);
    if (!s || s.status !== "LIVE") break;
    if (s.phase === "INTRO") s = (await startBidding(id))!;
    for (let k = 0; k < 250; k++) {
      s = (await getSession(id))!;
      if (s.phase === "SOLD" || s.phase === "UNSOLD" || s.status !== "LIVE") break;
      const passed: string[] = s.passedTeamIds;
      try {
        if (!passed.includes(s.userTeam.franchiseId) && (s.phase === "BIDDING" || s.phase === "HAMMER")) {
          s = (await placeUserBid(id, "pass"))!;
          continue;
        }
      } catch {
        // already passed
      }
      s = (await tickAuction(id, { forceAi: true }))!;
    }
    s = (await getSession(id))!;
    if (s.phase === "SOLD") sold += 1;
    if (s.phase === "UNSOLD") unsold += 1;
    for (const t of s.teams) personalities.add(t.franchise.personality);
    if (s.phase === "SOLD" || s.phase === "UNSOLD") {
      await nextPlayer(id);
    }
  }

  const final = await getSession(id);
  const purseOk = final!.teams.every((t) => t.purse >= 0);
  const overseasOk = final!.teams.every((t) => t.overseasCount <= final!.rules.maxOverseasPlayers);
  const squadOk = final!.teams.every((t) => t.members.length <= final!.rules.maxSquadSize);
  const summary = {
    id,
    resolved: sold + unsold,
    sold,
    unsold,
    personalities: [...personalities],
    purseOk,
    overseasOk,
    squadOk,
    userSquad: final!.userTeam.members.length,
    userPurse: final!.userTeam.purse,
    sampleIncrement: nextBidAmount(20_000_000, 20_000_000),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (sold + unsold < 10) throw new Error("Did not complete 10 lots");
  if (!purseOk || !overseasOk || !squadOk) throw new Error("Rule breach");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
