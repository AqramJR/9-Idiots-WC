/**
 * Seed script — populates Firestore with sample World Cup matches.
 *
 * Usage:
 *   1. Download a service account key from
 *      Firebase Console > Project Settings > Service Accounts > Generate new private key
 *   2. Save it as `serviceAccountKey.json` in the project root (already gitignored).
 *   3. Run: npm run seed
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Real flag images (flagcdn.com) instead of emoji — many systems (notably
// Windows) don't render colored flag emoji and just show plain letters.
const COUNTRY_CODES: Record<string, string> = {
  brazil: 'br',
  croatia: 'hr',
  argentina: 'ar',
  mexico: 'mx',
  france: 'fr',
  germany: 'de',
  spain: 'es',
  portugal: 'pt',
  england: 'gb-eng',
  netherlands: 'nl',
  belgium: 'be',
  japan: 'jp',
  usa: 'us',
  morocco: 'ma',
  italy: 'it',
  uruguay: 'uy',
  senegal: 'sn',
  'south korea': 'kr',
  colombia: 'co',
  switzerland: 'ch',
};

function flagUrl(team: string): string {
  const code = COUNTRY_CODES[team.trim().toLowerCase()];
  return code ? `https://flagcdn.com/w80/${code}.png` : '🏳️';
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function buildSeedMatches() {
  const now = Date.now();

  const fixtures: Array<[string, string, string, number]> = [
    ['Brazil', 'Croatia', 'Group A', -2 * DAY],
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
    const started = kickoff < now;
    const finished = started && offset < -1.5 * DAY;
    return {
      homeTeam,
      awayTeam,
      homeFlag: flagUrl(homeTeam),
      awayFlag: flagUrl(awayTeam),
      group,
      stage: 'Group Stage',
      kickoff,
      finalHome: finished ? 2 : null,
      finalAway: finished ? 1 : null,
      status: finished ? 'finished' : started ? 'live' : 'scheduled',
    };
  });
}

async function main() {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8'));
  } catch {
    console.error(
      '\n❌ Missing serviceAccountKey.json in project root.\n' +
        'Download it from Firebase Console > Project Settings > Service Accounts.\n'
    );
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const db = getFirestore();

  const matches = buildSeedMatches();
  const batch = db.batch();
  for (const match of matches) {
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const docId = `seed-${slug(match.homeTeam)}-${slug(match.awayTeam)}`;
    batch.set(db.collection('matches').doc(docId), match, { merge: true });
  }
  await batch.commit();

  console.log(`✅ Seeded ${matches.length} matches into Firestore.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
