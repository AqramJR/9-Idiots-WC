# 🤡 9 idiots WC

Predict every match, talk trash, and see who's the biggest idiot on the leaderboard by the end of the tournament.

Built with **React + TypeScript + Tailwind CSS**, **Firebase** (Email/Password Auth + Firestore + Hosting).

---

## Features

- **Username + password login, works on any device** — no anonymous browser sessions to lose. "Keep me logged in" persists your session; log in with the same username/password from any phone or computer and your score comes with you.
- **Live match predictions** — score inputs autosave to Firestore, and lock automatically the instant kickoff passes. Submit your pick and everyone else's picks for that match unlock immediately — try to sneak an edit after peeking and you'll get called out with a "بطل تقليد" toast first.
- **Automatic live sync** — a free GitHub Actions workflow re-imports real results and recalculates the leaderboard every 15 minutes, with no manual steps (see "Automatic live sync" below).
- **Live leaderboard** — ranked by points → exact predictions → correct outcomes, top 3 get medals 🥇🥈🥉. Scoring rules are shown right on the leaderboard page.
- **Admin dashboard** — protected page with two tabs: **Matches** (create/edit/delete matches, enter final scores, recalculate standings, reset all data, and **edit any player's prediction for that match — even after kickoff**, via the "Edit predictions" toggle on each match) and **Players** (adjust anyone's Points/Exact/Correct/Total-predictions via persistent Bonus fields, **view or edit any single player's predictions across every match** via "View predictions" on their row, or remove a player and their predictions entirely).
- **Players can edit their own name and avatar** any time from the Profile page ("Edit name / avatar").
- **Real team flags** — the `Flag` component renders either emoji flags or real flag image URLs (flagcdn.com) automatically, so flags look right on every OS/browser — including Windows, which doesn't render flag emoji.
- **Scoring** — exact score = **+3**, correct winner/draw = **+1**, wrong = **0**.
- **Profile page** — your picks, points, rank, and accuracy %.
- **Stats page** — most predicted winner, most predicted scoreline, outcome split, participation totals — all charted.
- **Toasts** for every important event: prediction saved, match locked, scores updated, leaderboard changed.
- Dark, glassmorphism, football-pitch themed UI. Mobile-first and fully responsive.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | React Context (`AuthContext`, `ToastContext`) + Firestore real-time hooks |
| Backend | Firebase (Auth + Firestore) |
| Hosting | Firebase Hosting |
| Charts | Chart.js via `react-chartjs-2` |
| Toasts | `react-hot-toast` |

---

## Project Structure

```
9-idiots-wc/
├── public/
│   └── trophy.svg
├── scripts/
│   └── seed.ts                # Node script to seed sample matches (uses firebase-admin)
├── src/
│   ├── components/
│   │   ├── admin/              # AdminLogin, AdminDashboard, MatchForm
│   │   ├── common/              # Skeleton, EmptyState
│   │   ├── join/                 # JoinForm
│   │   ├── landing/              # Hero
│   │   ├── layout/               # Navbar, Layout
│   │   ├── leaderboard/          # LeaderboardPage, LeaderboardRow
│   │   ├── matches/              # MatchCard, MatchesPage
│   │   ├── profile/              # ProfilePage
│   │   └── stats/                # StatsPage
│   ├── context/
│   │   ├── AuthContext.tsx      # username/password auth, derived identity, admin status
│   │   └── ToastContext.tsx     # notification helpers
│   ├── firebase/
│   │   └── config.ts            # Firebase app initialization
│   ├── hooks/
│   │   ├── useMatches.ts
│   │   ├── usePredictions.ts
│   │   ├── useAllPredictions.ts
│   │   └── useLeaderboard.ts
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   └── AdminPage.tsx
│   ├── router/
│   │   └── RequireIdentity.tsx  # redirects to /join if not signed in
│   ├── types/
│   │   └── index.ts             # Match, Prediction, User, LeaderboardEntry
│   ├── utils/
│   │   ├── scoring.ts           # scoring rules + aggregation
│   │   ├── recalculate.ts       # admin: rescoring + standings rewrite
│   │   ├── dateHelpers.ts       # kickoff lock + countdown formatting
│   │   ├── storage.ts           # localStorage identity persistence
│   │   └── seedData.ts          # sample fixtures (client-importable)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── .firebaserc
├── .env.example
└── package.json
```

---

## Database Structure (Firestore)

### `users/{userId}`
```ts
{
  name: string;
  avatar: string;              // emoji
  points: number;
  exactPredictions: number;
  correctOutcomes: number;
  wrongPredictions: number;
  totalPredictions: number;
  createdAt: number;
}
```

### `matches/{matchId}`
```ts
{
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;            // emoji flag
  awayFlag: string;
  group?: string;
  stage?: string;
  kickoff: number;             // epoch millis
  finalHome: number | null;
  finalAway: number | null;
  status: 'scheduled' | 'live' | 'finished';
}
```

### `predictions/{userId}_{matchId}`
```ts
{
  userId: string;
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  points: number | null;       // filled in by admin recalculation
  outcome: 'exact' | 'correct' | 'wrong' | null;
  createdAt: number;
  updatedAt: number;
}
```
The predictable, deterministic doc ID (`userId_matchId`) means each user can only ever have **one** prediction per match — writing again just updates it.

---

## Scoring Logic

Implemented in `src/utils/scoring.ts`:

- **Exact score** (predicted score == final score) → **+3**
- **Correct winner/draw only** (predicted outcome == final outcome, score differs) → **+1**
- **Wrong** → **0**

The admin's **"Recalculate standings"** button (`src/utils/recalculate.ts`) re-scores every prediction against final results and rewrites each user's `points`, `exactPredictions`, `correctOutcomes`, `wrongPredictions`, and `totalPredictions` in batched Firestore writes.

### `points` vs `bonusPoints`

Each user has two separate point fields:

- **`points`** — 100% auto-computed from scored predictions. Every recalculation (manual or the automatic GitHub Actions sync) **overwrites** this from scratch.
- **`bonusPoints`** — manual adjustments only. Recalculation **never touches this field**, so it persists forever. This is where:
  - Admin Dashboard → Players → **Bonus** field writes to (a straight `set`, via `setBonusPoints` in `src/utils/points.ts`).
  - The "caught copying" troll penalty (see below) writes to, via an atomic `increment(-5)` (`adjustBonusPoints`).

The leaderboard, profile page, and everywhere points are displayed always show **`points + bonusPoints`** (`LeaderboardEntry.totalPoints`) — never raw `points` alone. This is what fixed the earlier bug where admin-set points got wiped out the next time a match finished and standings recalculated.

### The "بطل تقليد" troll mechanic

Once you've submitted a prediction for a match, you can expand **"See everyone's predictions"** on that card. If you peek and then go edit your own pick before kickoff, you get a random roast toast (`caughtCopying` in `src/context/ToastContext.tsx` — edit the `COPY_CATCH_MESSAGES` array to add/change lines). Every 3rd time this happens (tracked in-memory per browser session), it escalates to a yes/no dialog offering a real **-5 bonus point** penalty if they own up to it — implemented with `toast.custom()` so it can render actual buttons, wired to `adjustBonusPoints(userId, -5)`.

---

## Security Model

- **Every player** signs in with a **username + password** (Firebase Auth email/password under the hood — usernames are converted to a fake internal email like `ahmed99@9idiotswc.local` so no real email address is ever required). This is what lets someone log into the same account from any device and keep their score, instead of the old anonymous-per-browser session that could reset.
- **"Keep me logged in"** toggles Firebase Auth persistence between `browserLocalPersistence` (stays logged in across visits/restarts — default) and `browserSessionPersistence` (logged out when the tab closes).
- **Admin access** is a property of a normal account, not a separate login. Whoever's UID exists as a document in the `admins` Firestore collection sees the Admin Dashboard when they visit `/admin` — everyone else sees "Not an admin." This has to be set up **manually, once, via Firebase Console** (see setup steps below) since there's no UI for it by design.
- **Firestore rules** (`firestore.rules`) enforce:
  - A user can create/update only **their own** `users/{uid}` doc.
  - A user can create/update only **their own** predictions, and only while the match is still within its open prediction window (server-side check, not just UI).
  - Only an admin (per the `admins` collection check above) can write to `matches/*`, delete users, or edit prediction scoring fields.
  - The `admins` collection itself can only be **read** by a user checking their own UID — never listed, never written to from the client.

---

## Migrating existing players from the old anonymous-login version

If your friends already used this app before it switched to username/password login, **their old scores won't automatically carry over** — their old profile is tied to an anonymous browser session (a Firebase UID with no password behind it), which is exactly the bug this update fixes, but it does mean a one-time manual cleanup:

1. Have each friend **sign up fresh** with a username + password (their old display name works fine as the new username too).
2. Note what their **old total points / exact / correct / predictions count** were (check the leaderboard or your own notes before they re-signed up).
3. In **Admin Dashboard → Players**, find their *new* account and set the **Bonus** fields (Points, Exact, Correct, Predictions) to match their old totals. Since `bonusPoints` etc. are never touched by recalculation, this permanently restores their standing.
4. Once confirmed, delete their old orphaned anonymous account via **Remove** in the Players tab (it'll still be sitting there under the same display name, taking up a leaderboard row with 0 new activity).

Their old individual match predictions won't transfer (they're tied to the old anonymous UID), but their overall standing does via the Bonus fields above — reasonable for a friends game where the leaderboard total is what actually matters.

## Getting Started

### 1. Prerequisites

- Node.js 18+
- A free [Firebase](https://console.firebase.google.com/) project

### 2. Clone & install

```bash
npm install
```

### 3. Create your Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Enable **Authentication** → Sign-in method → enable **Email/Password**. (That's the only provider needed — usernames are converted to internal fake emails under the hood, so players never see or need a real email address. You do **not** need to enable Anonymous.)
3. Enable **Cloud Firestore** (start in production mode — the rules in this repo cover access control).
4. Go to **Project Settings → General → Your apps → Add app → Web**, and copy the config values.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your Firebase config values:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 5. Deploy Firestore rules & indexes

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add              # pick your project, alias it "default"
firebase deploy --only firestore:rules,firestore:indexes
```

### 6. Make yourself (or someone) an admin

There's no signup flow for this by design — it's a manual, one-time step so a random player can never grant themselves admin access:

1. Run the app (or use the deployed site) and **sign up normally** with a username/password — same as any other player.
2. Firebase Console → **Authentication → Users**, find that account, and copy its **User UID**.
3. Firebase Console → **Firestore Database → Start collection** (or add to an existing one) → collection ID **`admins`** → **document ID = the UID you just copied** → any single field (e.g. `role: "admin"`) is enough, the content doesn't matter, only the document's existence and ID.
4. That account now sees the Admin Dashboard at `/admin`. Repeat for any other admins.

### 7. Get a Firebase service account key + a football-data.org API key (needed for the importer)

Both scripts below use `firebase-admin`, which bypasses Firestore security rules — perfect for one-time/admin-style data loading.

1. Firebase Console → **Project Settings → Service Accounts → Generate new private key**.
2. Save the downloaded file as `serviceAccountKey.json` in the project root (already `.gitignore`d).
3. For real match data, also get a free key at **[football-data.org/client/register](https://www.football-data.org/client/register)** (instant, no card required) and add it to `.env`:
   ```
   FOOTBALL_DATA_API_KEY=your-key-here
   ```

### 8. Import real World Cup 2026 matches (recommended) — or seed sample data

The **2026 FIFA World Cup is happening right now** (June 11 – July 19, 2026). Pull the real schedule and results directly into Firestore from [football-data.org](https://www.football-data.org/) — a well-established football data API (running since 2013) whose free tier includes the World Cup.

```bash
npm run import:wc2026
```

This upserts every match — real team names, kickoff times (converted from UTC), groups, and final scores for matches already played. It's **safe to re-run at any point during the tournament**:

- Already-played matches get their final scores filled in / corrected.
- Upcoming matches stay as-is until they're played.
- Knockout-stage matches show up immediately as **"TBD vs TBD"** placeholders (with their real scheduled kickoff time) as soon as football-data.org creates the fixture slot — even before the two teams are determined. Re-run the script periodically and team names fill in automatically as the bracket resolves. Matches are upserted by a stable match ID, so nothing gets duplicated.
- The script prints a breakdown of matches found by stage (Group Stage, Round of 32, etc.) both from the raw API response and after writing to Firestore — handy for confirming whether football-data.org has published a given round yet.

> Team crest images are used as each team's flag — the UI (`Flag` component) renders both emoji strings and image URLs automatically, so this works seamlessly alongside manually-created matches that use emoji flags.
>
> The free tier is rate-limited to 10 requests/minute — this script makes exactly one request, so you're fine even running it frequently.

**Alternatively**, for local testing/demo purposes with fictional matches instead of the real tournament:

```bash
npm run seed
```

This creates 10 sample matches (mix of finished, locked/live, and upcoming) with emoji flags, so you can see every UI state immediately without needing a football-data.org key.

You can also always just use the **Admin Dashboard** in the running app to create/edit matches by hand — any approach works alongside the others.

### 9. Run locally

```bash
npm run dev

```

Open the printed local URL. Click **Start Predicting**, enter a name, and go.

To access the admin dashboard, visit `/admin` and sign in with the email/password account you created in step 3.

---

## Deployment (Firebase Hosting)

```bash
npm run build
firebase deploy
```

This builds the app to `dist/` and deploys both **Hosting** and **Firestore rules/indexes** (as configured in `firebase.json`). Share the resulting `https://your-project.web.app` link with your friends — that's the whole "join system": open the link, enter a name, predict.

### One-liner

```bash
npm run deploy
```

(defined in `package.json` as `build` + `firebase deploy`)

---

## Automatic live sync (GitHub Actions — recommended, free)

By default, matches only update when you manually run `npm run import:wc2026`. To make results — and the leaderboard — update **automatically** without you doing anything, this project includes a GitHub Actions workflow (`.github/workflows/sync-worldcup.yml`) that runs every **15 minutes**:

1. Re-imports the latest World Cup matches/results (safe — upserts, never duplicates).
2. Recalculates every player's points so the leaderboard reflects new results right after they're synced.

This uses **GitHub's free scheduled-workflow minutes** — no Firebase billing upgrade required (Cloud Functions would need the paid Blaze plan even for a simple scheduled job; this sidesteps that entirely).

**Setup (one-time):**

1. Push this project to a GitHub repository (if it isn't already).
2. Base64-encode your `serviceAccountKey.json` so it can be stored as a GitHub secret:
   - **Windows (PowerShell):**
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json")) | Set-Clipboard
     ```
     (this copies the encoded string straight to your clipboard)
   - **Mac/Linux:**
     ```bash
     base64 -i serviceAccountKey.json | pbcopy   # macOS
     base64 -w0 serviceAccountKey.json           # Linux (copy the output manually)
     ```
3. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, and add two secrets:
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` — paste the base64 string from step 2.
   - `FOOTBALL_DATA_API_KEY` — your football-data.org key.
4. That's it. The workflow starts running automatically on its 15-minute schedule. You can also trigger it manually any time from your repo's **Actions** tab → **Sync World Cup data** → **Run workflow**.

> Note: GitHub's cron scheduler runs on a best-effort basis and can occasionally be delayed by a few minutes during high load — this isn't instant, second-by-second live data, but it keeps everything in sync automatically throughout the tournament without any manual steps.

## How the match lock works

Predictions have a **window**, not just a lock: they only open once a match is within **20 hours** of kickoff (`PREDICTION_WINDOW_MS` in `src/utils/dateHelpers.ts`), and close the instant kickoff passes. Outside that window a card shows "🕓 Predictions open 20h before kickoff" with disabled inputs; inside it, normal editable predictions; after kickoff, "🔒 Predictions closed." This is a UX convenience — the same 20-hour window and kickoff cutoff are **enforced server-side** in `firestore.rules` (`isPredictionWindowOpen()`), so a predicted score can never be written or edited outside that window even if someone tampers with the client. The **Matches → Open** tab only shows matches currently inside this window — matches further out simply won't appear until they enter it, keeping the tab focused on what's actually actionable right now.

The moment you submit your own prediction for a match, **"See everyone's predictions"** unlocks on that card — no waiting for kickoff. If you peek at everyone else's picks and then go change your own before kickoff, you'll get called out with a playful "بطل تقليد" toast first — it doesn't block the edit, it just roasts you a little before letting you through.

## How the leaderboard stays live

`useLeaderboard` subscribes to the entire `users` collection with Firestore's `onSnapshot`, so every client re-sorts and re-renders the instant any user's totals change. Those totals get updated in two ways:

- **Automatically**, every 15 minutes, via the GitHub Actions sync described above (import results → recalculate standings).
- **Instantly on demand**, via **Admin Dashboard → Recalculate standings**, if you want to force an update right after entering a result yourself.

A toast notification ("Leaderboard changed") fires on every update after the initial load, so players see when standings shift in real time.

---

## Updating this project with new files

If you're given updated files for this project (bug fixes, new features), **replace the entire `src/` and `scripts/` folders and all root config files** rather than copying individual files one at a time. Partial updates are the #1 cause of confusing bugs (old and new code running side by side, features that "don't show up," etc.).

**Safe update procedure:**
1. Keep your `.env` and `serviceAccountKey.json` — don't touch them.
2. Delete your existing `src/` and `scripts/` folders entirely.
3. Copy in the new `src/` and `scripts/` folders, plus any updated root files (`package.json`, `firestore.rules`, etc.) from the new package.
4. Run `npm install` (in case dependencies changed).
5. Run `npm run build && firebase deploy`.

If matches ever look duplicated or wrong after re-running an import/seed script with a different ID scheme, use **Admin Dashboard → Reset all matches** to wipe `matches` and `predictions` clean, then re-run the importer once.

## Why flags are images, not emoji

Team flags are rendered as real flag *images* (via [flagcdn.com](https://flagcdn.com), free, no key needed) rather than emoji flags (🇧🇷, 🇪🇸, etc.). This is intentional: many systems — Windows in particular — don't render colored flag emoji at all and instead show the raw two-letter country code as plain text. Using image URLs everywhere guarantees flags look right on every OS and browser. The `Flag` component (`src/components/common/Flag.tsx`) still supports plain emoji strings too, in case you prefer them for platforms where they render correctly.

## Customization ideas

- Add knockout-stage bonus multipliers (e.g. Final worth 2x points).
- Add push notifications 15 minutes before kickoff.
- Add group-stage standings prediction, not just match-by-match.
- Multiple admins already work out of the box — just add another UID to the `admins` collection. No extra setup needed.

---

## License

MIT — build on it, share it with your World Cup group chat.
