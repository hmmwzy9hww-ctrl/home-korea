export function formatWon(n: number | undefined | null): string {
  if (!n) return "0₩";
  if (n >= 10000) {
    const man = Math.floor(n / 10000);
    const rem = n % 10000;
    if (rem === 0) return `${man}만₩`;
    return `${man}만 ${rem.toLocaleString()}₩`;
  }
  return `${n.toLocaleString()}₩`;
}

export function formatWonShort(n: number | undefined | null): string {
  if (!n) return "0";
  if (n >= 10000) return `${Math.round(n / 10000)}만`;
  return `${n.toLocaleString()}`;
}
