/**
 * Import script — pulls the REAL FIFA World Cup 2026 schedule + live results
 * from football-data.org (api.football-data.org), a long-running, reliable
 * football data API that includes the World Cup in its free tier.
 *
 * Docs:   https://docs.football-data.org/general/v4/match.html
 * Signup: https://www.football-data.org/client/register (free, instant)
 *
 * Safe to re-run any time during the tournament — matches are upserted by
 * their stable football-data.org match ID, so re-running just fills in new
 * results and newly confirmed knockout-stage matchups as the bracket fills in.
 *
 * Usage:
 *   1. Get a free API key at https://www.football-data.org/client/register
 *   2. Add it to your .env file as FOOTBALL_DATA_API_KEY=xxxxxxxx
 *   3. Download a Firebase service account key (Firebase Console > Project
 *      Settings > Service Accounts > Generate new private key) and save it
 *      as `serviceAccountKey.json` in the project root (already gitignored).
 *   4. Run: npm run import:wc2026
 */
import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION_CODE = 'WC'; // FIFA World Cup

interface ApiTeam {
  id: number;
  name: string;
  shortName: string | null;
  crest: string | null;
}

interface ApiMatch {
  id: number;
  utcDate: string; // ISO 8601, e.g. "2026-06-11T19:00:00Z"
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED' | 'AWARDED';
  stage: string; // "GROUP_STAGE", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL", ...
  group: string | null; // "GROUP_A" or null for knockout rounds
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group Stage',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter-Final',
  SEMI_FINALS: 'Semi-Final',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
};

// Real flag images (flagcdn.com) keyed by football-data.org's team naming.
// Crest images from the API are federation badges, not always a clean flag,
// and some systems (notably Windows) don't render flag emoji at all — so we
// map straight to a reliable flag CDN instead.
const COUNTRY_CODES: Record<string, string> = {
  mexico: 'mx',
  'south africa': 'za',
  'south korea': 'kr',
  'korea republic': 'kr',
  'czech republic': 'cz',
  czechia: 'cz',
  canada: 'ca',
  'bosnia and herzegovina': 'ba',
  'bosnia & herzegovina': 'ba',
  qatar: 'qa',
  switzerland: 'ch',
  brazil: 'br',
  morocco: 'ma',
  haiti: 'ht',
  scotland: 'gb-sct',
  usa: 'us',
  'united states': 'us',
  paraguay: 'py',
  australia: 'au',
  turkey: 'tr',
  türkiye: 'tr',
  germany: 'de',
  curacao: 'cw',
  'curaçao': 'cw',
  'ivory coast': 'ci',
  "côte d'ivoire": 'ci',
  ecuador: 'ec',
  netherlands: 'nl',
  japan: 'jp',
  sweden: 'se',
  tunisia: 'tn',
  belgium: 'be',
  egypt: 'eg',
  iran: 'ir',
  'ir iran': 'ir',
  'new zealand': 'nz',
  spain: 'es',
  'cape verde': 'cv',
  'cabo verde': 'cv',
  'saudi arabia': 'sa',
  uruguay: 'uy',
  france: 'fr',
  senegal: 'sn',
  iraq: 'iq',
  norway: 'no',
  argentina: 'ar',
  algeria: 'dz',
  austria: 'at',
  jordan: 'jo',
  portugal: 'pt',
  'dr congo': 'cd',
  congo: 'cd',
  uzbekistan: 'uz',
  colombia: 'co',
  england: 'gb-eng',
  croatia: 'hr',
  ghana: 'gh',
  panama: 'pa',
};

function flagUrl(teamName: string): string {
  const code = COUNTRY_CODES[teamName.trim().toLowerCase()];
  return code ? `https://flagcdn.com/w80/${code}.png` : '🏳️';
}

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ');
}

function groupLabel(group: string | null): string | undefined {
  if (!group) return undefined;
  // "GROUP_A" -> "Group A"
  const letter = group.replace('GROUP_', '');
  return `Group ${letter}`;
}

// Only real, confirmed teams have a positive numeric id and a name in the
// football-data.org response — placeholder knockout slots aren't returned
// as matches at all by this API (unlike some static datasets), but we guard
// anyway in case a team object comes back incomplete.
function isRealTeam(team: ApiTeam): boolean {
  return !!team && typeof team.id === 'number' && !!team.name;
}

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.error(
      '\n❌ Missing FOOTBALL_DATA_API_KEY.\n' +
        'Get a free key at https://www.football-data.org/client/register\n' +
        'then add FOOTBALL_DATA_API_KEY=your-key to your .env file.\n'
    );
    process.exit(1);
  }

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

  const url = `${API_BASE}/competitions/${COMPETITION_CODE}/matches?limit=500`;
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey } });

  if (res.status === 403) {
    console.error(
      '\n❌ HTTP 403 — this API key does not have access to the World Cup competition.\n' +
        'Double-check your key at https://www.football-data.org/client/register — the World\n' +
        'Cup is included in the free tier, so this usually means the key is wrong or unconfirmed.\n'
    );
    process.exit(1);
  }
  if (res.status === 429) {
    console.error('\n❌ HTTP 429 — rate limited (free tier allows 10 requests/minute). Wait a moment and retry.\n');
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`❌ Failed to fetch source data: HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const data = (await res.json()) as { matches: ApiMatch[] };

  let imported = 0;
  let skipped = 0;

  const batchSize = 400;
  let batch = db.batch();
  let opCount = 0;
  const commits: Promise<FirebaseFirestore.WriteResult[]>[] = [];

  for (const m of data.matches) {
    if (!isRealTeam(m.homeTeam) || !isRealTeam(m.awayTeam)) {
      skipped += 1;
      continue;
    }

    const kickoff = new Date(m.utcDate).getTime();
    const finalHome = m.score.fullTime.home;
    const finalAway = m.score.fullTime.away;
    const status: 'scheduled' | 'finished' =
      finalHome !== null && finalAway !== null && (m.status === 'FINISHED' || m.status === 'AWARDED')
        ? 'finished'
        : 'scheduled';

    const docId = `wc26-${m.id}`;

    batch.set(
      db.collection('matches').doc(docId),
      {
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeFlag: flagUrl(m.homeTeam.name),
        awayFlag: flagUrl(m.awayTeam.name),
        group: groupLabel(m.group) ?? null,
        stage: groupLabel(m.group) ? 'Group Stage' : stageLabel(m.stage),
        kickoff,
        finalHome,
        finalAway,
        status,
      },
      { merge: true }
    );
    imported += 1;
    opCount += 1;

    if (opCount >= batchSize) {
      commits.push(batch.commit());
      batch = db.batch();
      opCount = 0;
    }
  }

  commits.push(batch.commit());
  await Promise.all(commits);

  console.log(
    `\n✅ Imported/updated ${imported} matches${skipped ? ` (${skipped} skipped — incomplete team data)` : ''}.`
  );
  console.log('   Run this script again any time to sync new results and knockout-stage matchups.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
