const ONE_CR = 10_000_000;
const TWO_CR = 20_000_000;
const FIVE_CR = 50_000_000;
const SPECIAL_125 = 12_500_000;

export function incrementFor(currentBid: number): number {
  // Auction-table quirk: the ₹1.25 Cr step stays at ₹5 L before the ₹10 L steps begin.
  if (currentBid === SPECIAL_125) return 500_000;
  if (currentBid < ONE_CR) return 500_000;
  if (currentBid < TWO_CR) return 1_000_000;
  if (currentBid < FIVE_CR) return 2_000_000;
  return 2_500_000;
}

export function nextBidAmount(currentBid: number, basePrice: number): number {
  if (currentBid <= 0) return basePrice;
  return currentBid + incrementFor(currentBid);
}

export function canAfford(
  purse: number,
  nextAmount: number,
  squadSize: number,
  rules: { minSquadSize: number; minPlayerPrice: number; maxSquadSize: number },
): boolean {
  if (nextAmount > purse) return false;
  if (squadSize >= rules.maxSquadSize) return false;
  const remainingAfter = purse - nextAmount;
  const slotsAfter = squadSize + 1;
  const stillNeeded = Math.max(0, rules.minSquadSize - slotsAfter);
  return remainingAfter >= stillNeeded * rules.minPlayerPrice;
}
