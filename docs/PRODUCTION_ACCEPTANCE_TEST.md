# Production Acceptance Test — Ouk Khmer Online

Target production:

- `https://ouk.kuonkhmer.com/`
- Backend: `https://ouk-khmer-backend-production.up.railway.app`
- Source of truth: `main`
- Current code baseline: PR #17 merge `de52e5e252ef6aeb8e8e2d7877783ddd4ff1db01`

## Rules

- Production test only unless explicitly assigned a code-fix task.
- Do not change Firebase/Railway/Vercel/Cloudflare/DNS/env/rules during testing.
- Do not edit `src/routeTree.gen.ts`.
- If credentials or a physical-device action are unavailable, mark BLOCKED rather than guessing.

## 1. Backend deployment freshness — FIRST

A prior black-box report proved Railway was serving an old backend build.

Check Railway directly:

### `/health`

Expected HTTP 200 body contains only:

- `status`
- `timestamp`

It must NOT expose:

- `server`
- `uptime`
- `realCount`
- `onlineCount`
- `metrics`
- room/PIN/socket/queue/log counts

### `/api/online-count`

Expected HTTP 200 JSON:

- `realCount`
- `onlineCount`

and `onlineCount = realCount + 50`.

If Railway still exposes old health metrics or returns 404 for online-count, report **BLOCKED: stale Railway deployment**. Do not recommend re-implementing the routes: they already exist in current `main`.

After Railway is current, check:

`https://ouk.kuonkhmer.com/api/online-count`

PR #17 proxies this path through Vercel to Railway. It should return the same JSON.

## 2. Responsive mobile/tablet visual test

Test at minimum:

- 360x800
- 390x844
- 430x932
- mobile landscape / short height
- 768x1024
- 820x1180
- 1024x1366
- tablet landscape

During an active online game verify:

- opponent/player bars remain close to the board on phones;
- no large empty vertical gap caused by full-height stretching;
- board does not clip horizontally;
- safe-area/home-indicator spacing does not hide controls;
- tablet remains compact and balanced;
- portrait <-> landscape recovers correctly.

## 3. Khmer display typography

Current product requirement supersedes the older Moul target.

For the large check splash and prominent Khmer display text:

- `អុក` must use **Koulen**, not Moul;
- prominent Khmer display classes should use the same Koulen treatment;
- visual feel should be large, strong and uppercase-like/display/calligraphic on both mobile and tablet;
- Khmer has no Latin uppercase/lowercase distinction, so do not judge this by CSS `text-transform`;
- native Koulen weight is used (`font-weight: 400`);
- `font-synthesis: none` must prevent fake bold;
- mobile/tablet should share one style while size responds to viewport;
- short landscape may reduce size to avoid clipping;
- the `អុក` event should remain visible for roughly the intended 3 seconds even if AI replies quickly.

## 4. PWA / launcher icon

Black-box production testing already confirmed the versioned assets exist and return 200:

- `/apple-touch-icon-20260904.png`
- `/icon-192-20260904.png`
- `/icon-512-20260904.png`
- `/icon-192-maskable-20260904.png`
- `/icon-512-maskable-20260904.png`

Physical-device acceptance when available:

- remove an old installed shortcut/PWA;
- reload production;
- Add to Home Screen/install again;
- confirm current IconKitchen artwork appears.

Native Android CI also installs and verifies IconKitchen launcher resources before Gradle build. A real installed APK remains the final visual confirmation.

## 5. Production auth

Use two distinct Firebase accounts when available:

- both can sign in on `https://ouk.kuonkhmer.com/`;
- no `auth/unauthorized-domain`;
- reload keeps valid session as expected;
- identity/name/avatar follow authenticated identity rather than arbitrary spoofed input.

## 6. Human matchmaking / private room / reconnect

With two distinct accounts:

- human matchmaking should pair them before AI fallback when both are searching compatibly;
- legal moves sync;
- illegal/wrong-turn moves are rejected without desync;
- private-room PIN is 6 digits;
- invalid PIN/full room is rejected;
- disconnect/reconnect restores color, board, turn, clocks and last move;
- stale socket must not regain control;
- draw/rematch/chat flows stay synchronized;
- rapid control spam must not crash the server and may produce `RATE_LIMITED`.

## 7. Real two-account ranked persistence — RELEASE BLOCKER

Record before-match fields for both users:

- `rating`
- `peakRating`
- `wins`
- `losses`
- `draws`
- `winStreak`
- `gamesPlayed`

Play one real human-vs-human production game to a definitive result.

Inspect Firestore DB:

`ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`

Required:

- each user updates exactly once;
- `gamesPlayed` increments exactly once each;
- winner/loser/draw counters are correct;
- rating movement is plausible;
- exactly ONE matching `match_history` document exists;
- reconnect/refresh/repeated game-over delivery does not duplicate Elo/history.

Also confirm two sessions using the SAME Firebase UID do not self-match as a ranked human game.

## 8. AI fallback

With one human only:

- human-first behavior remains intact;
- fallback appears after randomized roughly 10–30 seconds;
- bot name/rating look natural;
- online UI does not expose an obvious bot label;
- moves are not instant;
- bot game does NOT modify ranked stats or create human-ranked `match_history`.

## Final verdict

Report:

- PASS
- FAIL
- BLOCKED
- device matrix
- ranked before/after values
- `match_history` result
- launcher result if a real device was available

Do not mark `RELEASE READY` until:

1. Railway runs current backend routes;
2. primary-domain online-count proxy works;
3. two-account ranked persistence is verified.
