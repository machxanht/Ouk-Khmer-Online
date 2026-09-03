# Ouk Khmer Online — Project Handoff

_Last updated: 2026-09-04 (ICT)_

This is the durable handoff for future ChatGPT/dev sessions. Do not start by re-auditing the whole repository.

## 1. Project / production map

Repository: `machxanht/Ouk-Khmer-Online`

Frontend:
- Vite / React / TanStack Router.
- Vercel project: `ouk-khmer-online`.
- Build output: `.output/public`.
- Primary production URL: `https://ouk.kuonkhmer.com/`.
- Stable fallback: `https://ouk-khmer-online.vercel.app/`.

Backend:
- Railway service: `ouk-khmer-backend`.
- Host: `ouk-khmer-backend-production.up.railway.app`.
- Socket.IO authoritative multiplayer server.

Firebase:
- Project: `project-by-khang`.
- Named Firestore database: `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.
- User reports the custom-domain/Auth authorized-domain setup is complete; production acceptance must still confirm sign-in works on the custom domain.

DNS:
- Cloudflare is authoritative for `kuonkhmer.com`.
- `ouk` is DNS-only and points to Vercel's project-specific CNAME target.
- TenTen stale-DS/DNSSEC history is resolved and is not an active blocker.

## 2. Repository rules

- `main` is the source of truth.
- Preferred flow: branch -> tests -> PR -> merge commit.
- No force push, rebase, amend, or squash of published history.
- `src/routeTree.gen.ts` is generated; never edit it manually.
- Do not restore client-side Elo writes.
- Do not change Vercel output away from `.output/public`.
- Do not remove real-online-count + 50, human-first AI fallback, human-like bot names/ratings, or bot-unranked behavior unless explicitly requested.

Historical branches such as `online-multiplayer` may remain for history; do not merge them back into `main` without unique required commits.

## 3. Current merged baseline

Important merged PRs and merge commits:

- PR #1 verified auth / ranked authority: `d3abd0c366fdbba754a59013459854e408cfc872`
- PR #2 reconnect / secure PIN: `5cc442c4d323051316fb272a70fa2ff39c7d61cd`
- PR #3 Vercel output: `744ba00e3e783ee526e21ae9cc689f7eb4d2913f`
- PR #4 production assets + AI `អុក` trigger: `0dc7dda933b315f0d189101d6949dcebab10b4ad`
- PR #6 named Firestore database for ranked writes: `a93d8d79d518c8830966992af8132fe8a687a3a6`
- PR #10 production media integrity: `f4d2096e7902e18931e1f99aa0e0c58571b535b7`
- PR #11 custom-domain integration: `6bb564c006db8c99e5f79e7676a2185815d9148e`
- PR #12 responsive + security hardening: `3b15227109b9be37c2d47bdccf5289a86b23a8ca`
- PR #13 recursive log redaction + control-event throttling: `b83406f87ff71800318b042ef04c3856c13dade6`
- PR #14 authenticated multiplayer release gate: `ffefdf9930dfc83fdbc6be2feaaa075658148d59`
- PR #15 health minimization + launcher cache bust: `299d6bc59ad2e7db6e70dbef37c35bbf5fb20ce3`

## 4. Security posture already implemented

Do not reopen these as unfinished work without new evidence:

- Firebase ID-token signature/issuer/audience/time verification.
- Production rejects dev/test auth tokens.
- Verified auth required for matchmaking and private-room entry.
- Reconnect requires a high-entropy server session token.
- Private PIN generation uses `crypto.randomInt`.
- Server validates moves, clocks, game result and ranked outcome.
- Client cannot modify ranked fields through Firestore rules.
- Bot rooms never write ranked Elo/history.
- Same Firebase UID cannot match itself through normal matchmaking.
- Ranked persistence has an additional same-UID guard.
- Production Socket.IO CORS defaults are explicit; production no longer silently falls back to `*` when env config disappears.
- Rate limiting covers matchmaking, room create/join, moves, chat, reconnect, draw/rematch, resign and leave controls.
- Logger sanitization recursively redacts PIN/token/secret/credential/password/cookie/key-like fields.
- Public `/health` is minimized to `status` + `timestamp`; internal room/socket/PIN/log metrics were removed in PR #15.

## 5. Multiplayer / ranked behavior

Human matchmaking:
- Human opponent is preferred first.
- Same Firebase UID is not eligible as its own opponent.

AI fallback:
- Starts only if a compatible human was not matched first.
- Random wait is roughly 10–30 seconds.
- Bot levels/ratings remain randomized in plausible bands.
- Opponent payload intentionally avoids a visible bot flag/label.
- Bot move timing is delayed to feel non-instant.
- Bot rooms are intentionally unranked.

Ranked persistence:
- Human-vs-human authoritative result persistence uses the named Firestore database.
- Updates are serialized and `match_history` creation is guarded against duplicate creation.
- Code-side behavior is regression-tested.
- A real two-account production match is still required before saying ranked persistence is fully end-to-end verified.

## 6. Responsive / UI state

PR #12 corrected the online-game arena issue where phones could show player bars too far from the board because `min-h-screen + justify-between + flex growth` distributed vertical space.

Current intended behavior:
- phones use a compact flow with safe-area-aware bottom spacing;
- player bars stay visually close to the board;
- tablet remains compact rather than inheriting an over-compressed phone layout;
- Khmer `អុក` uses Moul regular (`font-weight: 400`, no synthetic bold), consistent across mobile/tablet and Vietnamese UI;
- `អុក` size is fluid and only shrinks further for short phone viewports;
- event-based trigger keeps the splash visible even if AI answers quickly.

This still needs real/representative mobile + tablet production visual acceptance.

## 7. Launcher icon state

Canonical source archive in repo root:

`IconKitchen-Output.zip`

The IconKitchen artwork was previously copied into web/iOS/Android asset areas, but web/PWA icon URLs were stable filenames and could remain cached by Android/iOS launchers.

PR #15 fixed the web/PWA launcher refresh path by publishing versioned `20260904` files and updating HTML/manifest references:

- `/apple-touch-icon-20260904.png`
- `/icon-192-20260904.png`
- `/icon-512-20260904.png`
- `/icon-192-maskable-20260904.png`
- `/icon-512-maskable-20260904.png`

The artwork itself was not regenerated or changed; existing IconKitchen binaries were reused under new URLs.

Important testing note:
- Existing installed PWA/home-screen entries may retain the old OS launcher icon until removed/reinstalled.
- New Add-to-Home-Screen/PWA installs should use the current IconKitchen icon.
- `android/res` contains IconKitchen Android resources, but the repository does not currently present a conventional tracked `android/app/src/main/res` tree as an authoritative native project path. Native APK launcher verification therefore remains a separate build/install test.

## 8. CI / release gates

Current Quality Gate checks:

1. `npm ci`
2. core engine tests
3. auth security regression tests
4. server security regression tests
5. multiplayer core regression tests
6. authenticated Socket.IO runtime tests
7. source asset integrity
8. production build
9. built asset integrity

Authenticated runtime coverage includes private room/PIN, move synchronization, disconnect/reconnect, draw, rematch/color swap and immediate human matchmaking. PR #15 also makes this runtime suite assert that `/health` does not expose internal metrics.

## 9. Remaining release acceptance — no more full audit

The next work is production testing only unless a failure reveals a code bug.

Use `docs/PRODUCTION_ACCEPTANCE_TEST.md`.

Required release acceptance:
- mobile/tablet spacing and orientation;
- Khmer `អុក` consistency on mobile/tablet;
- launcher icon after fresh PWA/Add-to-Home-Screen install;
- production auth on custom domain;
- human matchmaking;
- private room/PIN;
- reconnect;
- draw/rematch/chat;
- one real two-account ranked result with before/after stats and exactly one `match_history` document;
- AI fallback remains unranked.

Do not mark release-ready while the two-account ranked persistence test is unverified or failed.

## 10. Remaining lower-priority debt

Still open:
- in-memory room/matchmaking state disappears on backend restart;
- AI computation may become CPU-heavy under enough simultaneous bot games;
- public/private profile split is deferred for leaderboard compatibility;
- package/large committed asset hygiene can be improved later;
- native Android/APK build/install pipeline needs an explicit verification pass.

Already resolved and should not be listed as current debt: event rate limiting, PIN-attempt throttling, wildcard production CORS fallback, shallow logger redaction, detailed public health metrics.

## 11. How future sessions should work

1. Read this file, `docs/PROJECT_STATUS.md`, and `docs/PRODUCTION_ACCEPTANCE_TEST.md`.
2. Do not audit the repository again from scratch.
3. Test production first.
4. If a production acceptance test fails, make the smallest targeted fix on a branch.
5. Run the existing Quality Gate.
6. Merge with a merge commit.
7. Update handoff/status only with verified new facts.

Recommended fresh-session prompt:

`Read docs/PROJECT_HANDOFF.md, docs/PROJECT_STATUS.md and docs/PRODUCTION_ACCEPTANCE_TEST.md. main already includes PR #15 merge commit 299d6bc59ad2e7db6e70dbef37c35bbf5fb20ce3. Do not re-audit the repository. Continue with production acceptance at https://ouk.kuonkhmer.com/, especially mobile/tablet responsive checks, launcher icon reinstall, then a real two-account ranked persistence test.`
