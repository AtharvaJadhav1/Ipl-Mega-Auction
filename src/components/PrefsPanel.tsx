"use client";

import { useState } from "react";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { sfx } from "@/lib/sfx";

export function PrefsPanel() {
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-3 right-3 z-50 text-sm">
      {open && (
        <div role="dialog" aria-label="Display and accessibility settings" className="glass mb-2 w-64 space-y-3 rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Display &amp; access</p>
          <Toggle label="Dark mode" checked={prefs.theme === "dark"} onChange={(v) => setPrefs({ theme: v ? "dark" : "light" })} />
          <Toggle label="Reduce motion" checked={prefs.reducedMotion} onChange={(v) => setPrefs({ reducedMotion: v })} />
          <Toggle label="Colour-blind-safe teams" checked={prefs.colorBlind} onChange={(v) => setPrefs({ colorBlind: v })} />
          <Toggle
            label="Spoken commentary"
            checked={prefs.voice}
            onChange={(v) => {
              setPrefs({ voice: v });
              if (v) sfx.speak("Commentary on.");
            }}
          />
        </div>
      )}
      <button
        aria-expanded={open}
        aria-label="Display and accessibility settings"
        className="glass grid h-11 w-11 place-items-center rounded-full text-lg"
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" className="h-4 w-4 accent-[var(--gold)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
