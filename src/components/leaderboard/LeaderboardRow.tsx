import type { LeaderboardEntry } from '@/types';

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function LeaderboardRow({
  entry,
  isCurrentUser,
  nickname,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  nickname?: string;
}) {
  const medal = MEDALS[entry.rank];

  return (
    <div
      className={`glass-card mb-2 flex items-center gap-3 p-4 transition-colors sm:gap-4 ${
        isCurrentUser ? 'border-turf-400/50 bg-turf-500/[0.06]' : ''
      } ${entry.rank <= 3 ? 'shadow-glow' : ''}`}
    >
      <div className="flex w-8 flex-shrink-0 items-center justify-center font-display text-lg font-bold text-chalk-300">
        {medal ?? entry.rank}
      </div>

      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-lg">
        {entry.avatar || '⚽'}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-chalk-100">
          {entry.name} {isCurrentUser && <span className="text-xs text-turf-400">(you)</span>}
        </div>
        <div className="text-xs text-chalk-500">
          {entry.totalExact} exact · {entry.totalCorrect} correct
        </div>
        {nickname && <div className="mt-0.5 truncate text-[11px] italic text-gold-400">{nickname}</div>}
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="font-mono text-lg font-bold text-turf-400">{entry.totalPoints}</div>
        <div className="text-[10px] uppercase tracking-wider text-chalk-500">pts</div>
      </div>
    </div>
  );
}
