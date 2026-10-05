"use client";

import { FRANCHISES } from "@/data/franchises";
import { formatINR } from "@/lib/money";
import { usePrefs } from "@/lib/prefs";

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={className}>{formatINR(value)}</span>;
}

/** Okabe-Ito based palette: ten fills that stay distinguishable under common colour-vision deficiencies. */
const CB_PALETTE = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#999999", "#882255", "#44AA99"];
const CB_SECONDARY = "#1b1f2e";

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

/** Team colours, swapped for the colour-blind-safe palette when that preference is on. */
export function useTeamColors(shortName: string, primary: string, secondary: string) {
  const { colorBlind } = usePrefs();
  if (!colorBlind) return { primary, secondary };
  const idx = Math.max(0, FRANCHISES.findIndex((f) => f.shortName === shortName));
  return { primary: CB_PALETTE[idx % CB_PALETTE.length], secondary: CB_SECONDARY };
}

export function Crest({
  shortName,
  primary,
  secondary,
  size = 36,
}: {
  shortName: string;
  primary: string;
  secondary: string;
  size?: number;
}) {
  const colors = useTeamColors(shortName, primary, secondary);
  return (
    <div
      aria-hidden="true"
      className="grid place-items-center rounded-full font-semibold tracking-wide"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`,
        color: isLight(colors.primary) && colors.secondary === CB_SECONDARY ? "#111" : "#fff",
        fontSize: size * 0.28,
        boxShadow: `0 0 0 1px ${colors.primary}55`,
      }}
    >
      {shortName.slice(0, 4)}
    </div>
  );
}
