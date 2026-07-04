/**
 * Recalculate script — rescoring every prediction against final match
 * results and rewriting each user's totals. This is the automation-friendly
 * (firebase-admin) counterpart to src/utils/recalculate.ts, which is used
 * by the in-browser Admin Dashboard button.
 *
 * Run this after importing new results so the leaderboard reflects them:
 *   npm run recalculate
 *
 * Or run both together:
 *   npm run sync
 *
 * Usage:
 *   1. Download a service account key from
 *      Firebase Console > Project Settings > Service Accounts > Generate new private key
 *   2. Save it as `serviceAccountKey.json` in the project root (already gitignored).
 *   3. Run: npm run recalculate
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, type WriteResult } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const POINTS_EXACT = 3;
const POINTS_CORRECT = 1;
const POINTS_WRONG = 0;

type Outcome = 'home' | 'away' | 'draw';
type PenaltyWinner = 'home' | 'away';

function getOutcome(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

// A knockout match (no `group`) can't officially end in a draw — ties go to
// penalties. This resolves the "real" outcome for scoring: for a tied
// knockout match, the penalty winner IS the outcome; group-stage draws are
// left as legitimate draws.
function effectiveOutcome(
  home: number,
  away: number,
  isKnockout: boolean,
  penaltyWinner: PenaltyWinner | null | undefined
): Outcome {
  const scoreOutcome = getOutcome(home, away);
  if (scoreOutcome === 'draw' && isKnockout && penaltyWinner) return penaltyWinner;
  return scoreOutcome;
}

interface MatchDoc {
  finalHome: number | null;
  finalAway: number | null;
  finalPenaltyWinner?: PenaltyWinner | null;
  group?: string | null;
}

interface PredictionDoc {
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  predictedPenaltyWinner?: PenaltyWinner | null;
  points: number | null;
  outcome: 'exact' | 'correct' | 'wrong' | null;
}

function scorePrediction(
  p: Pick<PredictionDoc, 'predictedHome' | 'predictedAway' | 'predictedPenaltyWinner'>,
  m: MatchDoc
): { points: number; outcome: 'exact' | 'correct' | 'wrong' } | null {
  if (m.finalHome === null || m.finalAway === null) return null;
  if (p.predictedHome === m.finalHome && p.predictedAway === m.finalAway) {
    return { points: POINTS_EXACT, outcome: 'exact' };
  }
  const isKnockout = !m.group;
  const predicted = effectiveOutcome(p.predictedHome, p.predictedAway, isKnockout, p.predictedPenaltyWinner);
  const actual = effectiveOutcome(m.finalHome, m.finalAway, isKnockout, m.finalPenaltyWinner);
  return predicted === actual
    ? { points: POINTS_CORRECT, outcome: 'correct' }
    : { points: POINTS_WRONG, outcome: 'wrong' };
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

  const [matchesSnap, predictionsSnap, usersSnap] = await Promise.all([
    db.collection('matches').get(),
    db.collection('predictions').get(),
    db.collection('users').get(),
  ]);

  const matches = new Map<string, MatchDoc>(
    matchesSnap.docs.map((d) => [d.id, d.data() as MatchDoc])
  );
  const predictions = predictionsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as PredictionDoc) }));
  const userIds = usersSnap.docs.map((d) => d.id);

  const scored = predictions.map((p) => {
    const match = matches.get(p.matchId);
    if (!match) return { ...p, points: null as number | null, outcome: null as PredictionDoc['outcome'] };
    const result = scorePrediction(p, match);
    return result
      ? { ...p, points: result.points, outcome: result.outcome }
      : { ...p, points: null as number | null, outcome: null as PredictionDoc['outcome'] };
  });

  const totals = new Map<
    string,
    { points: number; exactPredictions: number; correctOutcomes: number; wrongPredictions: number; totalPredictions: number }
  >();
  for (const id of userIds) {
    totals.set(id, { points: 0, exactPredictions: 0, correctOutcomes: 0, wrongPredictions: 0, totalPredictions: 0 });
  }
  for (const p of scored) {
    if (p.points === null) continue;
    const t = totals.get(p.userId);
    if (!t) continue;
    t.points += p.points;
    t.totalPredictions += 1;
    if (p.outcome === 'exact') t.exactPredictions += 1;
    else if (p.outcome === 'correct') t.correctOutcomes += 1;
    else if (p.outcome === 'wrong') t.wrongPredictions += 1;
  }

  let batch = db.batch();
  let opCount = 0;
  const commits: Promise<WriteResult[]>[] = [];
  const flush = () => {
    if (opCount >= 400) {
      commits.push(batch.commit());
      batch = db.batch();
      opCount = 0;
    }
  };

  let changedPredictions = 0;
  for (const p of scored) {
    const original = predictions.find((x) => x.id === p.id);
    if (!original) continue;
    if (original.points === p.points && original.outcome === p.outcome) continue;
    batch.update(db.collection('predictions').doc(p.id), { points: p.points, outcome: p.outcome });
    changedPredictions += 1;
    opCount += 1;
    flush();
  }

  for (const [userId, t] of totals.entries()) {
    batch.update(db.collection('users').doc(userId), {
      points: t.points,
      exactPredictions: t.exactPredictions,
      correctOutcomes: t.correctOutcomes,
      wrongPredictions: t.wrongPredictions,
      totalPredictions: t.totalPredictions,
    });
    opCount += 1;
    flush();
  }

  commits.push(batch.commit());
  await Promise.all(commits);

  const scoredCount = scored.filter((p) => p.points !== null).length;
  console.log(
    `✅ Recalculated standings: ${scoredCount} scored predictions across ${userIds.length} players (${changedPredictions} predictions changed this run).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
