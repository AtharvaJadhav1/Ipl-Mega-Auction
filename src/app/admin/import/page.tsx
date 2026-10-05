"use client";

import { useState } from "react";

export default function AdminImportPage() {
  const [text, setText] = useState(
    "id,name,country,role,basePrice,megaBasePrice,capped,isOverseas,setCode,acquisition,statsSource\n",
  );
  const [token, setToken] = useState("");
  const [result, setResult] = useState<unknown>(null);
  async function send() {
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: text,
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "Network problem — import not sent." });
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="display text-4xl">Data import</h1>
      <p className="mt-2 text-sm text-white/55">CSV columns: id, name, country, role, basePrice (rupees), megaBasePrice, capped, isOverseas, setCode, acquisition, statsSource</p>
      <input
        className="field mt-4"
        type="password"
        placeholder="Admin token (required in production)"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <textarea className="field mt-4 min-h-[240px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={send} className="mt-4 rounded-full bg-[var(--gold)] px-6 py-2 font-semibold text-black">
        Import
      </button>
      {result !== null && (
        <pre className="mt-4 whitespace-pre-wrap text-xs text-white/70">{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  );
}
