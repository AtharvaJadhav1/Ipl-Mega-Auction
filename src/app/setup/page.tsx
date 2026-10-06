"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Crest } from "@/components/Brand";
import { formatINR } from "@/lib/money";

function SetupInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [franchises, setFranchises] = useState<{ id: string; shortName: string; primary: string; secondary: string }[]>([]);
  const [challenges, setChallenges] = useState<{ id: string; name: string }[]>([]);
  const [team, setTeam] = useState(params.get("team") || "rcb");
  const [mode, setMode] = useState(params.get("mode") || "mega");
  const [difficulty, setDifficulty] = useState("medium");
  const [speed, setSpeed] = useState("normal");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiAggression, setAiAggression] = useState(55);
  const [challengeId, setChallengeId] = useState("");
  const [customPurseCr, setCustomPurseCr] = useState(125);
  const [maxOverseas, setMaxOverseas] = useState(8);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auction/start")
      .then((r) => r.json())
      .then((j) => {
        setFranchises(j.franchises ?? []);
        setChallenges(j.challenges ?? []);
      })
      .catch(() => setError("Could not load franchises."));
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/auction/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userFranchiseId: team,
        mode,
        difficulty,
        speed,
        soundEnabled,
        aiAggression,
        name: name.trim() || undefined,
        challengeId: challengeId || undefined,
        customPurse: mode === "custom" ? customPurseCr * 10_000_000 : undefined,
        maxOverseas: mode === "custom" ? maxOverseas : undefined,
      }),
      });
    } catch {
      setBusy(false);
      setError("Network problem — please try again.");
      return;
    }
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !json) {
      setError(json?.error || "Could not start");
      return;
    }
    router.push(`/auction/${json.id}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <p className="text-[11px] uppercase tracking-[0.3em] gold">Auction settings</p>
      <h1 className="display mt-2 text-5xl">Select your franchise</h1>
      <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">
        {franchises.map((f) => (
          <button
            key={f.id}
            onClick={() => setTeam(f.id)}
            className={`glass flex items-center gap-2 rounded-xl p-3 text-left ${team === f.id ? "paddle active" : ""}`}
          >
            <Crest shortName={f.shortName} primary={f.primary} secondary={f.secondary} size={32} />
            <span className="text-sm">{f.shortName}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Field label="Mode">
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="mega">Mega auction</option>
            <option value="mini">2026 mini auction</option>
            <option value="quick">Quick</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
        <Field label="Difficulty">
          <select className="field" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </Field>
        <Field label="Game speed">
          <select className="field" value={speed} onChange={(e) => setSpeed(e.target.value)}>
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
            <option value="instant">Instant</option>
          </select>
        </Field>
        <Field label="Challenge">
          <select className="field" value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
            <option value="">None</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`AI aggression ${aiAggression}`}>
          <input type="range" min={0} max={100} value={aiAggression} onChange={(e) => setAiAggression(Number(e.target.value))} />
        </Field>
        <Field label="Save slot name (optional)">
          <input className="field" maxLength={60} placeholder="e.g. Hard mode RCB run" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Sound">
          <button className="glass rounded-full px-4 py-2 text-sm" onClick={() => setSoundEnabled((s) => !s)}>
            {soundEnabled ? "On" : "Off"}
          </button>
        </Field>
        {mode === "custom" && (
          <>
            <Field label={`Starting purse ${formatINR(customPurseCr * 10_000_000)}`}>
              <input type="range" min={40} max={125} value={customPurseCr} onChange={(e) => setCustomPurseCr(Number(e.target.value))} />
            </Field>
            <Field label={`Overseas cap ${maxOverseas}`}>
              <input type="range" min={2} max={8} value={maxOverseas} onChange={(e) => setMaxOverseas(Number(e.target.value))} />
            </Field>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-[var(--danger)]">{error}</p>}
      <button disabled={busy} onClick={start} className="mt-8 rounded-full bg-[var(--gold)] px-8 py-3 font-semibold text-black">
        {busy ? "Opening the room..." : "Start auction"}
      </button>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-[11px] uppercase tracking-widest text-white/45">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading settings...</div>}>
      <SetupInner />
    </Suspense>
  );
}
