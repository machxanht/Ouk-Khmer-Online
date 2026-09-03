# Project Status / Handoff

_Last updated: 2026-09-04 (ICT)_

This is the canonical current-state summary for `machxanht/Ouk-Khmer-Online`. Read this before changing deployment, auth, ranked persistence, online gameplay, responsive arena layout, or launcher/PWA assets.

## Repository safety

- `main` is the source of truth.
- Use branch -> tests -> PR -> merge commit.
- Do not force-push, rebase, amend, or squash published history.
- Never edit `src/routeTree.gen.ts` manually.
- Do not re-merge stale historical branches into `main` just because they still exist.

## Production architecture

- Frontend: Vercel project `ouk-khmer-online`.
- Primary URL: `https://ouk.kuonkhmer.com/`.
- Stable fallback: `https://ouk-khmer-online.vercel.app/`.
- DNS: Cloudflare authoritative; `ouk` remains DNS-only and points to the project-specific Vercel CNAME target.
- Backend: Railway service `ouk-khmer-backend` at `ouk-khmer-backend-production.up.railway.app`.
- Firebase project: `project-by-khang`.
- Firestore database: `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.
- User reports the custom-domain/Firebase authorized-domain setup is complete; production login still belongs in final acceptance testing.

Do not ask the user to repeat the completed TenTen/DS/DNS/Vercel/Firebase/Railway setup unless there is new evidence it was removed.

## Key merged production work

### PR #1 — verified auth + server-authoritative ranked
Merge commit: `d3abd0c366fdbba754a59013459854e408cfc872`

- Firebase ID tokens are verified server-side.
- Production rejects development auth tokens.
- Matchmaking/private-room entry requires verified identity.
- Reconnect requires a server-issued session token.
- Client Elo writes were removed.
- Human-vs-human ranked results are persisted by the backend.
- Firestore rules prevent clients from editing ranked fields.
- Bot games remain unranked.

### PR #2 — reconnect/PIN hardening
Merge commit: `5cc442c4d323051316fb272a70fa2ff39c7d61cd`

- Private PIN uses `crypto.randomInt`.
- Reconnect-by-color fallback was removed.

### PR #3 / #4 — Vercel output + production media routing
Merge commits: `744ba00e3e783ee526e21ae9cc689f7eb4d2913f`, `0dc7dda933b315f0d189101d6949dcebab10b4ad`

- Vercel output remains `.output/public`.
- Catch-all rewrite no longer swallows real static assets.
- Khmer `អុក` check splash became event-based so a fast AI reply does not instantly cancel it.

### PR #6 — ranked Firestore database fix
Merge commit: `a93d8d79d518c8830966992af8132fe8a687a3a6`

- Ranked backend and frontend target the same named Firestore database.
- Do not restore `(default)` Firestore REST paths.

### PR #10 — mandatory media integrity in production build
Merge commit: `f4d2096e7902e18931e1f99aa0e0c58571b535b7`

- `npm run build` fails on corrupt/missing/orphaned required media.
- Vite asset output remains `/app-assets/` under `.output/public`.

### PR #11 — custom-domain integration
Merge commit: `6bb564c006db8c99e5f79e7676a2185815d9148e`

- `https://ouk.kuonkhmer.com/` is the canonical production URL.
- Capacitor navigation allowlist includes the custom domain while retaining the stable Vercel fallback.
- Documentation no longer treats TenTen/stale DS as an active blocker.

### PR #12 — responsive + server security hardening
Merge commit: `3b15227109b9be37c2d47bdccf5289a86b23a8ca`

- Phone game arena no longer stretches player bars far away from the board because of full-height `justify-between` layout.
- Responsive override uses compact mobile flow and safe-area-aware spacing.
- Khmer `អុក` uses Moul regular treatment consistently across Vietnamese UI, mobile and tablet; synthetic bold is disabled and size is fluid.
- Production Socket.IO CORS no longer silently falls back to wildcard when `CORS_ORIGIN` is missing.
- Rate limits were added to matchmaking/private-room/move/chat traffic.
- Matchmaking blocks two sockets authenticated as the same Firebase UID from pairing together.
- Ranked persistence has a second same-UID guard so Elo/history cannot be manufactured by one account.
- `npm run test:security` was added to CI.

### PR #13 — log redaction + control-event throttling
Merge commit: `b83406f87ff71800318b042ef04c3856c13dade6`

- Logger redaction is recursive and covers PINs, auth/session tokens, secrets, credentials, passwords, cookies and keys.
- Reconnect/draw/rematch/resign/leave events are rate limited in addition to the earlier event set.

### PR #14 — authenticated multiplayer release gate
Merge commit: `ffefdf9930dfc83fdbc6be2feaaa075658148d59`

Quality Gate now includes:

- core engine tests;
- auth security regression tests;
- server security regression tests;
- multiplayer core tests;
- authenticated Socket.IO runtime tests;
- source asset integrity;
- production build;
- built asset integrity.

The authenticated runtime suite exercises private room/PIN, move sync, disconnect/reconnect using the server session token, draw, rematch/color swap and immediate human matchmaking.

### PR #15 — public health minimization + launcher cache bust
Merge commit: `299d6bc59ad2e7db6e70dbef37c35bbf5fb20ce3`

- `/health` and backend `/` now expose basic liveness only: `status` and `timestamp`.
- Internal room count, active PIN count, socket mappings, queue size, buffered log count, real online count, backend label and uptime are no longer public through health.
- Runtime CI fails if those health metrics reappear.
- `/api/online-count` is intentionally unchanged and still supports the product behavior real count + 50.
- Existing IconKitchen launcher artwork was republished under versioned `20260904` filenames.
- `manifest.json` and HTML launcher/touch-icon references now use the versioned URLs to defeat stale Android/iOS/PWA launcher caching.
- Manifest now has explicit stable `id` and `scope` of `/`.

## Launcher icon state

- Canonical source archive exists at repository root: `IconKitchen-Output.zip`.
- Web/PWA launcher files are in `public/` and PR #15 versioned their URLs without changing the artwork.
- New PWA/Add-to-Home-Screen installs should fetch the current IconKitchen icon rather than a cached old filename.
- Existing already-installed shortcuts may need removal/reinstall because OS launchers can retain icon metadata independently of browser cache.
- IconKitchen Android resources also exist under `android/res`.
- Do not claim a native APK launcher icon is fully verified until the actual Android build/install pipeline is tested; the tracked repository does not currently present a conventional `android/app/src/main/res` tree as the authoritative native project path.

## Intentional product behavior — do not "fix"

- displayed online count = real connected count + 50;
- human matchmaking is preferred before AI fallback;
- AI fallback waits a randomized roughly 10–30 seconds when no compatible human is available;
- bots use human-like names and randomized plausible ratings;
- online opponent payload does not intentionally advertise a visible bot label;
- bot games do not write ranked Elo/history;
- Vercel output directory remains `.output/public`.

## What remains before calling the release fully verified

Code-side hardening and automated regression coverage are strong. The remaining work is production acceptance, not another full repository audit.

1. Test responsive game UI on real/representative mobile and tablet viewports.
2. Verify phone player bars now stay close to the board and tablet layout remains compact.
3. Verify `អុក` uses the same Moul regular visual treatment on mobile/tablet and remains visible for the intended event duration.
4. Reinstall/Add to Home Screen on Android/iOS/PWA and verify the current IconKitchen launcher image.
5. Run production auth smoke on `https://ouk.kuonkhmer.com/`.
6. Run private room, matchmaking, reconnect, draw/rematch/chat production flows.
7. Run one real two-account human-vs-human ranked result and verify exactly one ranked update per user plus exactly one `match_history` document.
8. Confirm an AI fallback match does not alter ranked stats/history.

The detailed test procedure is in `docs/PRODUCTION_ACCEPTANCE_TEST.md`.

Do not mark release-ready until the two-account ranked persistence test is actually verified.

## Remaining lower-priority technical debt

These are still real but are not blockers for the current acceptance pass unless production testing exposes them:

- room/matchmaking state is in memory and is lost on backend restart;
- AI computation can still become CPU-heavy under enough concurrent bot load;
- public/private profile split is intentionally deferred because leaderboard compatibility still depends on readable `/users` data;
- package/large-asset hygiene remains imperfect (`package-lock.json`, `bun.lock`, large committed assets/source archive);
- native Android/APK pipeline and launcher resources still need an explicit build/install verification pass.

The following items are NO LONGER open technical debt and should not be re-proposed as unfinished work without new evidence: event-level rate limiting, PIN-attempt throttling, production CORS wildcard fallback, shallow logger sanitization, detailed public `/health` metrics.

## Fresh-session continuation

Use this instruction:

`Read docs/PROJECT_STATUS.md, docs/PROJECT_HANDOFF.md, and docs/PRODUCTION_ACCEPTANCE_TEST.md. Do not re-audit the repository. main is the source of truth and includes PR #15 merge commit 299d6bc59ad2e7db6e70dbef37c35bbf5fb20ce3. Continue with production acceptance on https://ouk.kuonkhmer.com/: mobile/tablet visual checks, launcher icon reinstall check, then real two-account ranked persistence. Do not redo completed Railway/Firebase/Vercel/Cloudflare setup.`
