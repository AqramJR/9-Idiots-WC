export function isLocked(kickoff: number, now: number = Date.now()): boolean {
  return now >= kickoff;
}

export function msUntil(kickoff: number, now: number = Date.now()): number {
  return kickoff - now;
}

export function formatKickoff(kickoff: number): string {
  const d = new Date(kickoff);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Kicked off';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
