"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Crest } from "@/components/Brand";
import { PageStatus, useAuctionData } from "@/hooks/useAuctionData";
import { formatINR } from "@/lib/money";
import type { AuctionView } from "@/lib/types";

type TradeResponse = { accepted: boolean; message: string; session: AuctionView | null };

export default function TradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: loaded, error } = useAuctionData(id);
  const [fresh, setFresh] = useState<AuctionView | null>(null);
  const data = fresh ?? loaded;
  const [partnerId, setPartnerId] = useState("");
  const [offer, setOffer] = useState<string[]>([]);
  const [request, setRequest] = useState<string[]>([]);
  const [result, setResult] = useState<{ accepted: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!data) return <PageStatus label="Loading trade window..." error={error} />;

  const partners = data.teams.filter((t) => !t.isUser);
  const partner = partners.find((t) => t.franchiseId === partnerId) ?? partners[0];
  const open = data.status === "COMPLETE";
  const toggle = (list: string[], setList: (v: string[]) => void, pid: string) =>
    setList(list.includes(pid) ? list.filter((x) => x !== pid) : list.length < 5 ? [...list, pid] : list);

  async function propose() {
    if (!partner) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/auction/${id}/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerFranchiseId: partner.franchiseId, offerPlayerIds: offer, requestPlayerIds: request }),
      });
      const json = (await res.json().catch(() => null)) as (TradeResponse & { error?: string }) | null;
      if (!res.ok || !json) {
        setResult({ accepted: false, message: json?.error ?? "Trade failed." });
      } else {
        setResult({ accepted: json.accepted, message: json.message });
        if (json.accepted && json.session) {
          setFresh(json.session);
          setOffer([]);
          setRequest([]);
        }
      }
    } catch {
      setResult({ accepted: false, message: "Network problem — try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href={`/auction/${id}`} className="text-sm gold">
        ← Room
      </Link>
      <h1 className="display mt-3 text-5xl">Trading window</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Swap players with an AI franchise once the auction is complete. Contracts move with the players, so purses settle on the price difference. Squad, overseas
        and purse limits apply to both sides.
      </p>
      {!open && (
        <p role="status" className="glass mt-5 rounded-xl p-4 text-sm text-white/70">
          The window opens when the auction is complete. Finish the remaining lots first.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Trade partner">
        {partners.map((t) => (
          <button
            key={t.franchiseId}
            aria-pressed={partner?.franchiseId === t.franchiseId}
            onClick={() => {
              setPartnerId(t.franchiseId);
              setRequest([]);
            }}
            className={`glass flex items-center gap-2 rounded-full px-3 py-1 text-sm ${partner?.franchiseId === t.franchiseId ? "paddle active" : ""}`}
          >
            <Crest shortName={t.franchise.shortName} primary={t.franchise.primary} secondary={t.franchise.secondary} size={22} />
            {t.franchise.shortName}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section aria-label="Your players">
          <p className="text-[11px] uppercase tracking-widest text-white/45">You offer ({offer.length}/5)</p>
          <ul className="mt-2 space-y-1">
            {data.userTeam.members.map((m) => (
              <PlayerRow key={m.id} name={m.player.name} role={m.player.role} price={m.price} on={offer.includes(m.playerId)} onToggle={() => toggle(offer, setOffer, m.playerId)} />
            ))}
          </ul>
        </section>
        <section aria-label="Their players">
          <p className="text-[11px] uppercase tracking-widest text-white/45">
            You request from {partner?.franchise.shortName} ({request.length}/5)
          </p>
          <ul className="mt-2 space-y-1">
            {(partner?.members ?? []).map((m) => (
              <PlayerRow key={m.id} name={m.player.name} role={m.player.role} price={m.price} on={request.includes(m.playerId)} onToggle={() => toggle(request, setRequest, m.playerId)} />
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          disabled={!open || busy || !offer.length || !request.length}
          onClick={propose}
          className="rounded-full bg-[var(--gold)] px-8 py-3 text-sm font-semibold text-black"
        >
          {busy ? "Negotiating..." : "Propose trade"}
        </button>
        <p className="text-sm text-white/60">
          Purse {formatINR(data.userTeam.purse)} · Squad {data.userTeam.members.length}/{data.rules.maxSquadSize}
        </p>
      </div>
      {result && (
        <p role="status" className={`mt-4 text-sm ${result.accepted ? "gold" : "text-[var(--danger)]"}`}>
          {result.message}
        </p>
      )}
    </main>
  );
}

function PlayerRow({ name, role, price, on, onToggle }: { name: string; role: string; price: number; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        onClick={onToggle}
        aria-pressed={on}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-[var(--gold)] bg-white/10" : "border-white/10"}`}
      >
        <span>
          {name}
          <span className="block text-[11px] text-white/45">{role.replaceAll("_", " ")}</span>
        </span>
        <span className="text-xs text-white/60">{price ? formatINR(price) : "—"}</span>
      </button>
    </li>
  );
}
