# Ouk Khmer Online — Project Handoff

_Last updated: 2026-09-04 (ICT)_

Durable handoff for future ChatGPT/dev sessions. Do not start by re-auditing the repository.

## 1. Project map

Repository: `machxanht/Ouk-Khmer-Online`

Frontend:
- Vite / React / TanStack Router.
- Vercel project `ouk-khmer-online`.
- Output `.output/public`.
- Production `https://ouk.kuonkhmer.com/`.
- Fallback `https://ouk-khmer-online.vercel.app/`.

Backend:
- Railway `ouk-khmer-backend`.
- `https://ouk-khmer-backend-production.up.railway.app`.
- Socket.IO authoritative multiplayer.

Firebase:
- Project `project-by-khang`.
- Firestore DB `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.

DNS:
- Cloudflare authoritative.
- `ouk` DNS-only to Vercel project-specific CNAME.
- TenTen/DS/DNSSEC issue is historical and resolved.

## 2. Non-negotiable repo/product rules

- `main` is the source of truth.
- Branch -> tests -> PR -> merge commit.
- No force push/rebase/amend/squash of published history.
- Never edit `src/routeTree.gen.ts` manually.
- Never restore client Elo/stat writes.
- Keep Vercel output `.output/public`.
- Preserve displayed online count = real + 50.
- Preserve human-first matchmaking, randomized 10–30s AI fallback, human-like bot identities/ratings and bot-unranked behavior.

## 3. Current baseline

Latest important merge:

PR #17 — Khmer display typography + primary-domain online-count proxy

Merge commit:

`de52e5e252ef6aeb8e8e2d7877783ddd4ff1db01`

It follows prior merged security/domain/media work through PR #16.

PR #17 changed:

- prominent Khmer display type from Moul to **Koulen**;
- `អុក` splash and existing Khmer display classes use the native Koulen face with `font-synthesis: none`;
- mobile/tablet Khmer display sizing is intentionally large and consistent;
- Vercel now rewrites `/api/online-count` to the Railway backend endpoint.

PR #17 Quality Gate passed all current engine/auth/security/multiplayer/assets/build gates before merge.

## 4. Production report interpretation

A black-box production report received after PR #15/#16 found:

- frontend/custom domain/PWA/media largely healthy;
- Railway `/health` still exposed old detailed metrics;
- Railway `/api/online-count` returned 404;
- primary-domain `/api/online-count` returned 404;
- real two-account ranked verification was blocked by lack of credentials/device context.

Do NOT treat the first two backend findings as missing code in current `main`.

Current `main/server/index.ts` already has:

- `/health` -> `{ status, timestamp }` only;
- `/api/online-count` -> `{ realCount, onlineCount: realCount + 50 }`.

Therefore the Railway live service in that report is stale. Required deployment action:

1. redeploy Railway from current `main` (prefer current merge `de52e5e...`);
2. confirm Railway `/health` no longer exposes old metrics;
3. confirm Railway `/api/online-count` returns JSON;
4. confirm Vercel `/api/online-count` rewrite then works on `https://ouk.kuonkhmer.com/api/online-count`.

There is no Railway connector/plugin available in the current ChatGPT session, so do not claim this redeploy was performed unless another tool/user action actually performs it.

## 5. Security state

Already implemented and regression-tested:

- Firebase ID-token verification on backend;
- dev/test tokens rejected in production;
- verified auth for matchmaking/private rooms;
- secure PIN RNG;
- reconnect session token;
- server-authoritative game/move/clock/result handling;
- server-authoritative ranked writes;
- Firestore rules block client ranked writes;
- bot games unranked;
- same-UID self-match protection at matchmaking and ranked-persistence layers;
- production Socket.IO CORS explicit fallback behavior;
- rate limiting for matchmaking, room/PIN, move, chat, reconnect, draw/rematch/resign/leave;
- recursive secret/PIN/token log redaction;
- health endpoint regression assertion;
- authenticated Socket.IO runtime suite.

## 6. Responsive + Khmer typography

Phone spacing fix from PR #12 remains active:

- online arena uses compact flow on phones;
- player/opponent bars should not be stretched far from the board;
- safe-area bottom spacing is preserved;
- tablet remains balanced.

Product decision as of PR #17:

- do **not** use Moul for the large `អុក` / prominent Khmer display treatment;
- use **Koulen**;
- desired feel is large, strong, uppercase-like Khmer display/calligraphy on mobile and tablet;
- Khmer itself has no Latin uppercase/lowercase transformation;
- use native `font-weight: 400` and `font-synthesis: none`; do not fake 700;
- short mobile landscape may scale down only to prevent clipping.

Visual production acceptance still needs a representative mobile/tablet check after Vercel deploys PR #17.

## 7. Launcher icon state

Source archive:

`IconKitchen-Output.zip`

Web/PWA:
- versioned `20260904` icon URLs are in `public/` and referenced by manifest/HTML;
- black-box report confirmed all versioned icon files returned 200.

Native Android:
- `.github/workflows/main.yml` creates/syncs the Capacitor Android project during CI;
- it extracts the IconKitchen archive;
- it copies launcher resources into `android/app/src/main/res`;
- it explicitly verifies Android launcher icons before Gradle build.

On the post-merge PR #17 APK run, both `Install Icon Kitchen launcher icons` and `Verify Android launcher icons` passed.

A real installed APK/PWA remains the final visual proof because OS launchers can cache metadata/icons independently.

## 8. Release gates

Quality Gate currently includes:

1. core engine tests;
2. auth security regression;
3. server security regression;
4. multiplayer core regression;
5. authenticated Socket.IO runtime;
6. source asset integrity;
7. production build;
8. built asset integrity.

APK workflow additionally builds the web bundle, prepares Capacitor Android, installs/verifies IconKitchen launcher resources, syncs web assets, and builds/uploads APK artifacts.

## 9. Remaining blockers

Do not mark release-ready until these are resolved:

1. Railway current-main redeploy and `/health` + `/api/online-count` recheck.
2. Vercel primary-domain `/api/online-count` recheck after backend is current.
3. Mobile/tablet visual acceptance for player spacing and Koulen Khmer display treatment.
4. One real two-account human ranked match with before/after stats and exactly one `match_history` record.
5. Verify AI fallback match does not write ranked stats/history.
6. Fresh PWA/native install launcher visual check when a real device is available.

## 10. Lower-priority debt

- in-memory room/matchmaking state is lost on backend restart;
- concurrent AI load may pressure the Node event loop;
- public/private profile split remains deferred for leaderboard compatibility;
- package/large committed asset hygiene can be improved later.

## 11. Continue from here

Future session instruction:

`Read PROJECT_STATUS.md, PROJECT_HANDOFF.md and PRODUCTION_ACCEPTANCE_TEST.md. main includes PR #17 merge de52e5e252ef6aeb8e8e2d7877783ddd4ff1db01. Do not re-audit. The supplied production report proves Railway is stale relative to main. First redeploy/recheck Railway /health and /api/online-count, then verify the Vercel proxy, then mobile/tablet Koulen UI, and finally the real two-account ranked persistence test.`
