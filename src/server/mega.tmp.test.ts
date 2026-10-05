import { expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  confirmRetention,
  getSession,
  listSessions,
  nextPlayer,
  placeUserBid,
  proposeTrade,
  skipPlayer,
  startAuction,
  startBidding,
  tickAuction,
  updateSettings,
  userRtm,
} from "@/server/game";

it("mega auction: retention, RTM, pause, trade, history", async () => {
  const created = (await startAuction({
    userFranchiseId: "rcb",
    mode: "mega",
    difficulty: "medium",
    speed: "instant",
    soundEnabled: false,
    aiAggression: 60,
  }))!;
  const id = created.id;
  expect(created.phase).toBe("RETENTION");
  expect(created.lots.length).toBe(0);
  expect(created.retention!.candidates.length).toBeGreaterThan(8);

  await expect(confirmRetention(id, ["nobody"])).rejects.toThrow();
  const top = created.retention!.candidates.slice(0, 2).map((c) => c.id);
  const s0 = (await confirmRetention(id, top))!;
  expect(s0.phase).toBe("INTRO");
  expect(s0.userTeam.members.length).toBe(2);
  expect(s0.userTeam.rtmCards).toBe(4);
  expect(s0.userTeam.purse).toBeLessThan(1_250_000_000);
  expect(s0.teams.filter((t) => !t.isUser).every((t) => t.members.length >= 3)).toBe(true);
  const retained = new Set(s0.teams.flatMap((t) => t.members.map((m) => m.playerId)));
  expect(s0.lots.some((l) => retained.has(l.playerId))).toBe(false);

  // pause blocks actions and ticking
  await updateSettings(id, { paused: true, speed: "fast" });
  await expect(startBidding(id)).rejects.toThrow(/paused/);
  await updateSettings(id, { paused: false });

  let rtmEvents = 0;
  let userRtmHandled = 0;
  for (let i = 0; i < 45; i++) {
    let s = (await getSession(id))!;
    if (s.phase === "INTRO") s = (await startBidding(id))!;
    for (let k = 0; k < 400; k++) {
      s = (await getSession(id))!;
      if (s.phase === "SOLD" || s.phase === "UNSOLD") break;
      if (s.phase === "RTM" && s.rtmPending?.isUser) {
        userRtmHandled++;
        s = (await userRtm(id, s.rtmPending.canMatch && userRtmHandled % 2 ? "match" : "decline"))!;
        continue;
      }
      const lot = s.currentLot!;
      const out = s.passedTeamIds.includes("rcb");
      if (!out && s.phase !== "RTM") {
        try {
          await placeUserBid(id, "pass");
        } catch {
          /* leading */
        }
      }
      s = (await tickAuction(id))!;
      void lot;
    }
    const n = await nextPlayer(id);
    if (n?.status !== "LIVE") break;
  }
  const events = await prisma.auctionEvent.findMany({ where: { sessionId: id } });
  rtmEvents = events.filter((e) => e.type.startsWith("RTM")).length;
  const final = (await getSession(id))!;
  expect(final.teams.every((t) => t.purse >= 0)).toBe(true);
  expect(final.teams.every((t) => t.rtmCards >= 0 && t.rtmCards <= 6)).toBe(true);
  console.log("RTM events", rtmEvents, "user RTM decisions", userRtmHandled, "types", [...new Set(events.map((e) => e.type))].join(","));

  // skip while RTM isn't pending still works
  const s2 = (await getSession(id))!;
  if (s2.phase === "INTRO") await skipPlayer(id);

  // trading is closed until complete
  const partner = final.teams.find((t) => !t.isUser && t.members.length > 0)!;
  await expect(proposeTrade(id, partner.franchiseId, [final.userTeam.members[0].playerId], [partner.members[0].playerId])).rejects.toThrow(/complete/);
  await prisma.auctionSession.update({ where: { id }, data: { status: "COMPLETE", phase: "COMPLETE" } });
  const fair = await proposeTrade(id, partner.franchiseId, [final.userTeam.members[0].playerId], [partner.members[0].playerId]);
  expect(typeof fair.accepted).toBe("boolean");
  const best = [...partner.members].sort((a, b) => b.price - a.price)[0];
  const lopsided = await proposeTrade(id, partner.franchiseId, [final.userTeam.members[1].playerId], [best.playerId]).catch((e) => ({ accepted: false, message: String(e) }));
  console.log("trades", fair.message, "|", lopsided.message);

  const history = await listSessions();
  expect(history.find((h) => h.id === id)?.name).toBeTruthy();
}, 900000);
