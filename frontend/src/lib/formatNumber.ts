export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  
  if (num < 1_000_000) {
    return `${(num / 1000).toFixed(1)}k`.replace(/\.0k$/, "k");
  }
  
  if (num < 1_000_000_000) {
    return `${(num / 1_000_000).toFixed(1)}m`.replace(/\.0m$/, "m");
  }
  
  return `${(num / 1_000_000_000).toFixed(1)}b`.replace(/\.0b$/, "b");
}
