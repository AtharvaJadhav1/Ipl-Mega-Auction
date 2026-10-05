export const CRORE = 10_000_000;
export const LAKH = 100_000;

export function rupees(crore: number, lakh = 0): number {
  return Math.round(crore * CRORE + lakh * LAKH);
}

export function formatINR(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= CRORE) {
    const cr = abs / CRORE;
    const text = Number.isInteger(cr) ? String(cr) : cr.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}₹${text} Cr`;
  }
  const lk = abs / LAKH;
  const text = Number.isInteger(lk) ? String(lk) : lk.toFixed(2).replace(/\.?0+$/, "");
  return `${sign}₹${text} L`;
}

export function formatFullINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
