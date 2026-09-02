# Ouk Khmer Online — Project Handoff

This file is the durable handoff for any future ChatGPT/dev session. Read this before changing code.

## 1. What this project is

Ouk Khmer Online is a Khmer chess (Ouk Chatrang / អុកចត្រង្គ) web/app project focused on a stable playable experience for real users.

Core product flows:
- Play locally / vs AI.
- Online matchmaking.
- Private rooms with PIN.
- Reconnect into active online games.
- Chess clocks, resign/draw/game-over handling.
- Firebase authentication, user profile/rating/history.
- Realtime backend on Railway.
- Frontend deployment on Vercel.
- Android/APK workflow exists in the repository.

Primary goal: make the product reliable and release-ready. Do not refactor working gameplay architecture just for cleanliness.

## 2. Product behavior that is intentional — do NOT "fix"

The following are deliberate product choices, not bugs:
- Online count is displayed as real online users + 50.
- AI fallback is intentional.
- Bots use human-like names and randomized ratings.

Do not remove or normalize these unless the product owner explicitly asks.

## 3. Repository rules

Repository: `machxanht/Ouk-Khmer-Online`

Important rules from `AGENTS.md`:
- Repo is connected to Lovable.
- Do not rewrite published history: no force-push, rebase, amend, or squash of pushed commits.
- Pushed commits sync back to Lovable.
- TanStack file-based routing is used.
- `routeTree.gen.ts` is generated and must not be edited manually.

Preferred change flow: branch -> tests -> PR -> merge commit.

## 4. Architecture / deployment map

Frontend:
- Vite / React.
- Build output: `.output/public`.
- Vercel project: `ouk-khmer-online`.
- Production domain: `ouk-khmer-online.vercel.app`.
- Custom domain: `ouk.kuonkhmer.com`.

Realtime backend:
- Railway service: `ouk-khmer-backend`.
- Production URL: `ouk-khmer-backend-production.up.railway.app`.

Firebase:
- Project ID: `project-by-khang`.
- Firestore uses a named database, not `(default)`.
- Database ID currently used by both frontend and ranked backend code: `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.
- Backend supports override through `FIRESTORE_DATABASE_ID`.

DNS / custom domain:
- `ouk.kuonkhmer.com` CNAME is already pointed to `cname.vercel-dns.com`.
- TenTen DNS has a stale/invalid DNSSEC DS delegation problem.
- Do not change the CNAME as a first response.
- TenTen must remove stale DS records at the `.com` registry if DNSSEC is not being used.

## 5. Completed work

### PR #1 — security hardening / ranked authority
Merged to main with merge commit `d3abd0c366fdbba754a59013459854e408cfc872`.

Completed:
- Cryptographic Firebase JWT verification on backend.
- Dev auth tokens blocked in production unless explicitly allowed.
- Verified auth required for matchmaking/private-room entry.
- Identity bound to verified claims.
- Reconnect requires session token.
- Server-authoritative Elo/stat persistence.
- Immutable `match_history` writes from backend.
- Firestore rules prevent clients from editing ranked fields.
- Quality workflow added.
- Auth tests added.

Do not restore client-authoritative Elo writes.

### PR #2 — reconnect / PIN follow-up
Merged with merge commit `5cc442c4d323051316fb272a70fa2ff39c7d61cd`.

Completed:
- Private-room PIN generation moved from `Math.random` to `crypto.randomInt`.
- Reconnect no longer accepts color fallback.
- Invalid session token path is explicit.

### PR #3 — Vercel build output
Merged with merge commit `744ba00e3e783ee526e21ae9cc689f7eb4d2913f`.

Completed:
- Vercel `outputDirectory` fixed to `.output/public`.
- Production 404 from wrong output directory was resolved.

Do not revert output directory to `dist`.

### PR #4 — production assets + AI check splash
Merged with merge commit `0dc7dda933b315f0d189101d6949dcebab10b4ad`.

Completed in code:
- Removed catch-all SPA rewrite that intercepted real build assets.
- Replaced it with explicit route rewrites.
- Added event-based splash trigger for the large Khmer `អុក` / CHECK animation.
- AI/local flow now increments a splash event when a move results in check, so a fast AI reply should not instantly cancel the 3-second splash.

Production build was READY and emitted built assets including mascot/image/audio bundles.

### PR #5 — handoff/status refresh
Merged to main. It refreshed `docs/PROJECT_STATUS.md` and linked status documentation from README.

## 6. Production configuration already done — do NOT ask the user to repeat it

Railway:
- `FIREBASE_SERVICE_ACCOUNT_JSON` was configured with the downloaded Firebase service-account JSON.
- Backend was redeployed successfully and became ACTIVE.

Firestore:
- Hardened rules were manually published.
- User does not need to paste/publish them again unless code changes require a new rules change.

Vercel:
- Project is linked to the correct GitHub repo.
- Vite framework configured.
- `.output/public` is the correct output directory.
- Production deployments after the Vercel fix reached READY.

DNS:
- CNAME is already correct.
- Remaining custom-domain issue is DNSSEC/DS at TenTen/registry level.

## 7. Latest verification state

Firestore database mismatch concern:
- RESOLVED in code.
- Frontend and `server/ranked-manager.ts` use the same named Firestore database ID: `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.
- Backend can override with `FIRESTORE_DATABASE_ID`.

Production assets:
- `/pieces/ada/wK.svg` was successfully fetched from production.
- Production JS bundle was successfully fetched.
- A mascot hashed URL test returned 404, but that test used a guessed/stale hash and therefore does NOT prove the current build mascot is broken.
- Source `src/assets/mascot.png` exists.
- Next session should first read production `index.html` / current JS bundle to discover the actual emitted mascot asset URL, then fetch that exact URL. Do not guess the hash.

AI check animation:
- Code path has been fixed and build/tests passed.
- Still needs practical UI verification by making the human give check to the AI and confirming the large `អុក` splash remains visible for the intended duration even if AI replies quickly.

Ranked persistence:
- Server-authoritative implementation exists.
- Definitive validation still requires a real two-account human-vs-human ranked match and checking rating/stat + `match_history` results.

## 8. Priority roadmap

### P0 — make the shipped product demonstrably correct
Work these in order without re-auditing the whole repo:
1. Verify current production asset URLs using exact hashes from the deployed HTML/JS; fix only if an exact current asset fails.
2. Verify the AI check `អុក` animation in a real interaction.
3. Smoke-test login/auth on production.
4. Smoke-test online matchmaking.
5. Smoke-test private-room create/join/PIN.
6. Smoke-test reconnect into an active game.
7. Run one real two-account human-vs-human ranked game and verify authoritative Elo/stats + `match_history` persistence.
8. Recheck custom domain after TenTen removes stale DS records.

### P1 — hardening for real users
Only after P0 is green:
- Add event-level abuse/rate limiting where useful, especially PIN guessing and spammy socket events.
- Review CORS and health endpoint exposure.
- Decide what minimum room-state persistence is needed across backend restarts.

Do not overengineer distributed persistence unless actual usage requires it.

### P2 — UX / performance
- Check mobile layouts and loading/error states.
- Measure and reduce unnecessary high-frequency rerenders (especially online clock UI) if they are visibly costly.
- Investigate AI worker/event-loop blocking only if measurable on target devices.

### P3 — release readiness
- Full production smoke test of all major user journeys.
- Verify Android/APK pipeline and current APK build status.
- Ensure README/docs match production reality.
- Mark release-ready only after P0 flows are proven end-to-end.

## 9. Known lower-priority technical debt

- Public/private profile split is deferred; do not claim it is done.
- Event-level abuse/rate limits are incomplete.
- In-memory room/matchmaking state is lost on backend restart.
- Some AI computation may still be CPU-heavy.
- Health endpoint/CORS/logger sanitization can be tightened.
- Package/large-asset hygiene remains lower priority.

## 10. Working method for future ChatGPT/dev sessions

Do NOT start by auditing the whole repository again.

Required loop:
1. Read this file and `docs/PROJECT_STATUS.md`.
2. Confirm current main/deployment state only where needed for the next task.
3. Take the first unfinished P0 item.
4. Fix it if needed.
5. Run relevant tests/build.
6. Use branch -> PR -> merge commit; do not squash/rebase pushed history.
7. Verify production where applicable.
8. Update this handoff and `docs/PROJECT_STATUS.md` with what changed, exact PR/commit/deployment IDs, what was verified, and what remains.
9. Continue automatically to the next unfinished priority item.

Only stop to ask the user when:
- A real product decision is required, or
- A required account/permission/action cannot be completed with available tools.

Do not make the user repeat Railway/Firebase/Vercel setup that is already recorded here.

## 11. Recommended prompt for a fresh session

`Read docs/PROJECT_HANDOFF.md and docs/PROJECT_STATUS.md in machxanht/Ouk-Khmer-Online. Continue from the first unfinished P0 item. Do not re-audit the whole repo, do not redo completed Railway/Firebase/Vercel setup, and update both handoff docs after each completed work cluster.`
