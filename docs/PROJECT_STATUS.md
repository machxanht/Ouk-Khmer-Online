# Project Status / Handoff

_Last updated: 2026-09-04 (ICT)_

Canonical current-state summary for `machxanht/Ouk-Khmer-Online`. Do not re-audit the repository from scratch.

## Repository rules

- `main` is the source of truth.
- Use branch -> tests -> PR -> merge commit.
- No force-push/rebase/amend/squash of published history.
- Never edit `src/routeTree.gen.ts` manually.
- Do not restore client-side Elo writes.
- Preserve online count = real + 50, human-first AI fallback, human-like bot names/ratings, and bot-unranked behavior.

## Production map

- Frontend: Vercel project `ouk-khmer-online`.
- Primary URL: `https://ouk.kuonkhmer.com/`.
- Vercel fallback: `https://ouk-khmer-online.vercel.app/`.
- DNS: Cloudflare authoritative, `ouk` DNS-only to Vercel project-specific CNAME.
- Backend: Railway `ouk-khmer-backend-production.up.railway.app`.
- Firebase project: `project-by-khang`.
- Firestore DB: `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.

## Current merged baseline

Main includes all prior security/ranked/domain/media work plus:

- PR #12 responsive + security hardening — `3b15227109b9be37c2d47bdccf5289a86b23a8ca`
- PR #13 recursive log redaction + event throttling — `b83406f87ff71800318b042ef04c3856c13dade6`
- PR #14 authenticated multiplayer release gate — `ffefdf9930dfc83fdbc6be2feaaa075658148d59`
- PR #15 health minimization + launcher cache bust — `299d6bc59ad2e7db6e70dbef37c35bbf5fb20ce3`
- PR #16 release handoff/docs — `00c53390720aecf89db57ea44782e55d83f48359`
- PR #17 Khmer display typography + `/api/online-count` Vercel proxy — `de52e5e252ef6aeb8e8e2d7877783ddd4ff1db01`

PR #17 Quality Gate passed engine, auth, server-security, multiplayer-core, authenticated Socket.IO runtime, source assets, production build and built-asset integrity before merge.

## Production black-box report received 2026-09-04

Verified PASS from the supplied production report:

- `https://ouk.kuonkhmer.com/` served successfully through Vercel.
- Security headers were present.
- PWA manifest was valid.
- All versioned `20260904` launcher assets returned 200.
- Major image/audio/piece assets returned successfully.
- Human-first / delayed AI fallback code behavior matched the intended product behavior.

### Important backend deployment mismatch

The production report found:

- Railway `/health` still exposed the OLD detailed payload (`uptime`, room/PIN/socket/queue/log metrics).
- Railway `/api/online-count` returned 404.

This is NOT the state of current `main`.

Current `main/server/index.ts` already contains:

- `/health` -> only `{ status, timestamp }`;
- `/api/online-count` -> `{ realCount, onlineCount: realCount + 50 }`.

Therefore the Railway live service observed by the report is running a stale backend deployment. Do not re-add or rewrite these routes. The required action is to redeploy Railway from current `main` (at least PR #15; preferably current main `de52e5e...`) and then re-test both endpoints.

PR #17 also adds a Vercel rewrite:

`/api/online-count` -> `https://ouk-khmer-backend-production.up.railway.app/api/online-count`

The primary-domain endpoint will only return the desired JSON once Railway is running the current backend route.

## Khmer typography — current product decision

The previous Moul-regular acceptance target is obsolete.

Current desired presentation:

- large `អុក` check splash uses **Koulen**;
- prominent Khmer display text using the existing Khmer display classes also uses **Koulen**;
- appearance should feel large, strong, uppercase-like/display/calligraphic on mobile and tablet;
- Khmer has no Latin uppercase/lowercase transformation, so the visual treatment comes from the display typeface and scale;
- use the native Koulen face (`font-weight: 400`) with `font-synthesis: none`; do not fake a 700 weight;
- mobile and tablet use the same type treatment with responsive sizing;
- short mobile landscape may scale down to avoid clipping.

PR #17 updated both `src/styles.css` and the later-loaded `src/responsive.css`, so there is no longer a Moul-700 base rule fighting a later override.

## Responsive state

PR #12 removed the mobile arena spacing bug caused by `min-h-screen + justify-between + flex growth`.

Current expectation:

- mobile player/opponent bars remain close to the board;
- tablet stays compact and balanced;
- safe-area spacing is retained;
- portrait/landscape should not clip the board or controls.

Representative/real-device visual acceptance is still required.

## Launcher state

- Source archive: `IconKitchen-Output.zip` at repo root.
- PWA/icon URLs are versioned with `20260904` to avoid stale launcher/browser cache.
- GitHub APK workflow creates the Capacitor Android project, extracts the IconKitchen archive, copies launcher resources into `android/app/src/main/res`, and verifies them before Gradle build.
- On the PR #17 post-merge APK run, `Install Icon Kitchen launcher icons` and `Verify Android launcher icons` both passed.
- A physical installed APK/PWA is still the final visual confirmation because OS launchers can cache icon metadata.

## Security posture already implemented

Do not reopen without new evidence:

- verified Firebase ID-token backend auth;
- secure PIN RNG;
- reconnect session token;
- server-authoritative moves/results/ranked writes;
- bot games unranked;
- same-UID self-match protection;
- production CORS hardening;
- socket/PIN/control-event rate limits;
- recursive secret/PIN/token log redaction;
- health-response regression test;
- authenticated multiplayer core/runtime release gates.

## Remaining release blockers

1. Redeploy Railway from current `main`, then verify backend `/health` and `/api/online-count`.
2. After Vercel has deployed PR #17, verify `https://ouk.kuonkhmer.com/api/online-count` proxies successfully.
3. Visually verify Koulen `អុក` + prominent Khmer display text on mobile/tablet and confirm player-bar spacing.
4. Run one real two-account human-vs-human production ranked game and verify exactly one stats/rating update per user plus exactly one `match_history` document.
5. Confirm an AI fallback game does not modify ranked stats/history.
6. Fresh-install PWA/native APK on a real device when available and confirm current IconKitchen launcher artwork.

Do not mark `RELEASE READY` until the Railway deployment mismatch and two-account ranked verification are resolved.

## Lower-priority debt

- Room/matchmaking state is in memory and disappears on backend restart.
- Heavy concurrent bot load may still pressure the Node event loop.
- Public/private profile split is deferred for leaderboard compatibility.
- Package/large committed-asset hygiene can be improved later.

## Fresh-session continuation

`Read docs/PROJECT_STATUS.md, docs/PROJECT_HANDOFF.md and docs/PRODUCTION_ACCEPTANCE_TEST.md. main includes PR #17 merge de52e5e252ef6aeb8e8e2d7877783ddd4ff1db01. Do not re-audit. The supplied production report proves Railway is still running a stale backend: redeploy current main, recheck /health and /api/online-count, then finish mobile/tablet Koulen visual acceptance and the real two-account ranked persistence test.`
