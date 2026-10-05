import { formatINR } from "@/lib/money";

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={className}>{formatINR(value)}</span>;
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
  return (
    <div
      className="grid place-items-center rounded-full font-semibold tracking-wide"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, ${primary}, ${secondary})`,
        color: "#fff",
        fontSize: size * 0.28,
        boxShadow: `0 0 0 1px ${primary}55`,
      }}
    >
      {shortName.slice(0, 4)}
    </div>
  );
}
