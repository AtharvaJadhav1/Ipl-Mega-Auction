"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crest } from "@/components/Brand";
import { formatINR } from "@/lib/money";

const MODES = [
  { id: "mega", title: "Mega auction", body: "Retain up to 6 players on real slab prices, then bid with the rest as Right to Match cards. ₹125 Cr cap. Game simulation — 2026 was a mini-auction in real life." },
  { id: "mini", title: "2026 mini auction", body: "Real purses, retentions and the Dec 2025 auction pool. Each franchise holds one Right to Match card (a game variant)." },
  { id: "quick", title: "Quick auction", body: "Marquee sets and high-impact names only." },
  { id: "custom", title: "Custom", body: "Tune purse, overseas cap, AI aggression and speed." },
];

export default function HomePage() {
  const [meta, setMeta] = useState<{
    latestId?: string | null;
    franchises: { id: string; shortName: string; primary: string; secondary: string; miniPurse: number }[];
  } | null>(null);
  useEffect(() => {
    fetch("/api/auction/start")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => setMeta({ franchises: [] }));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] gold">Franchise control room</p>
          <h1 className="display mt-3 text-6xl leading-[0.9] md:text-7xl">Sit the table. Run the paddle. Build the squad.</h1>
          <p className="mt-5 max-w-xl text-white/65">
            A server-authoritative IPL auction simulator. Verified 2026 season batting leaders and auction sold prices sit beside clearly labelled game ratings. Nothing is invented as official.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/setup" className="rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-black">
              Start game
            </Link>
            <Link href="/history" className="glass rounded-full px-6 py-3 text-sm">
              Saved auctions
            </Link>
            {meta?.latestId && (
              <Link href={`/auction/${meta.latestId}`} className="glass rounded-full px-6 py-3 text-sm">
                Continue auction
              </Link>
            )}
            <Link href="/players" className="glass rounded-full px-6 py-3 text-sm">
              Player database
            </Link>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">2026 context</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>Mini-auction: 16 Dec 2025, Abu Dhabi · 77 sold · ₹215.45 Cr spent</li>
            <li>Salary cap used here: ₹125 Cr (10 × cap from official remaining + spent table)</li>
            <li>Orange cap: Vaibhav Sooryavanshi 776 · Purple cap: Kagiso Rabada 29</li>
            <li>RCB defended the title vs GT</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {MODES.map((m) => (
          <Link key={m.id} href={`/setup?mode=${m.id}`} className="glass rounded-2xl p-5 hover:border-[var(--gold)]/40">
            <p className="gold text-[11px] uppercase tracking-[0.25em]">{m.id}</p>
            <h2 className="display mt-2 text-3xl">{m.title}</h2>
            <p className="mt-2 text-sm text-white/60">{m.body}</p>
          </Link>
        ))}
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Franchises</p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
          {(meta?.franchises ?? []).map((f) => (
            <Link key={f.id} href={`/setup?team=${f.id}`} className="glass flex items-center gap-3 rounded-xl p-3">
              <Crest shortName={f.shortName} primary={f.primary} secondary={f.secondary} />
              <div>
                <p className="text-sm font-semibold">{f.shortName}</p>
                <p className="text-[11px] text-white/45">{formatINR(f.miniPurse)} mini purse</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
