import type { Match } from '@/types';
import { flagUrl } from './flags';

// A small round of sample fixtures. Kickoffs are staggered from "now" so
// you can see locked vs open predictions immediately after seeding.
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function buildSeedMatches(): Omit<Match, 'id'>[] {
  const now = Date.now();

  const fixtures: Array<[string, string, string, number]> = [
    ['Brazil', 'Croatia', 'Group A', -2 * DAY], // already kicked off (locked, no result yet)
    ['Argentina', 'Mexico', 'Group A', -1 * DAY],
    ['France', 'Germany', 'Group B', -3 * HOUR],
    ['Spain', 'Portugal', 'Group B', 6 * HOUR],
    ['England', 'Netherlands', 'Group C', 1 * DAY],
    ['Belgium', 'Japan', 'Group C', 2 * DAY],
    ['USA', 'Morocco', 'Group D', 3 * DAY],
    ['Italy', 'Uruguay', 'Group D', 4 * DAY],
    ['Senegal', 'South Korea', 'Group E', 5 * DAY],
    ['Colombia', 'Switzerland', 'Group E', 6 * DAY],
  ];

  return fixtures.map(([homeTeam, awayTeam, group, offset]) => {
    const kickoff = now + offset;
    const alreadyStarted = kickoff < now;
    return {
      homeTeam,
      awayTeam,
      homeFlag: flagUrl(homeTeam),
      awayFlag: flagUrl(awayTeam),
      group,
      stage: 'Group Stage',
      kickoff,
      finalHome: alreadyStarted && offset < -1.5 * DAY ? 2 : null,
      finalAway: alreadyStarted && offset < -1.5 * DAY ? 1 : null,
      status: alreadyStarted && offset < -1.5 * DAY ? 'finished' : alreadyStarted ? 'live' : 'scheduled',
    };
  });
}
