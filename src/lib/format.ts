export function formatWon(n: number | undefined | null): string {
  if (!n) return "0원";
  return `${n.toLocaleString()}원`;
}

export function formatWonShort(n: number | undefined | null): string {
  if (!n) return "0원";
  return `${n.toLocaleString()}원`;
}
