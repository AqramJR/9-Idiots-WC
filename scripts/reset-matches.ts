/**
 * Clears every document out of the `matches` collection (and, optionally,
 * every `predictions` document tied to them) so you can re-import real
 * World Cup data from a clean slate — no leftover fictional seed matches
 * or stale entries from an earlier import.
 *
 * ⚠️ This deletes ALL matches. Predictions are only deleted if you pass --with-predictions.
 *
 * Usage:
 *   npm run reset:matches                    # deletes matches only
 *   npm run reset:matches -- --with-predictions   # also deletes every prediction
 *
 * Then re-import clean data with:
 *   npm run import:wc2026
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const withPredictions = process.argv.includes('--with-predictions');

async function deleteCollection(db: FirebaseFirestore.Firestore, name: string): Promise<number> {
  const snap = await db.collection(name).get();
  if (snap.empty) return 0;

  let deleted = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 400)) {
      batch.delete(d.ref);
      deleted += 1;
    }
    await batch.commit();
  }
  return deleted;
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

  const matchesDeleted = await deleteCollection(db, 'matches');
  console.log(`🗑️  Deleted ${matchesDeleted} matches.`);

  if (withPredictions) {
    const predictionsDeleted = await deleteCollection(db, 'predictions');
    console.log(`🗑️  Deleted ${predictionsDeleted} predictions.`);
  } else {
    console.log('   (Predictions were left untouched — pass --with-predictions to also clear those.)');
  }

  console.log('\n✅ Done. Now run: npm run import:wc2026');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
