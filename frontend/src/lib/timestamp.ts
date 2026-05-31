const timestampPattern = /(?:^|\s)(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)(?=\s|$|[,.!?])/;

export function parseTimestamp(text: string): number | null {
  const match = text.match(timestampPattern);
  if (!match) {
    return null;
  }

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
