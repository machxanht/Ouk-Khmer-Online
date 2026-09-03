# Production Acceptance Test — Ouk Khmer Online

Run this against the deployed production site only:

- Primary URL: `https://ouk.kuonkhmer.com/`
- Fallback URL for comparison only: `https://ouk-khmer-online.vercel.app/`
- Current production source of truth: `main`
- Current release baseline includes merge commit `de52e5e252ef6aeb8e8e2d7877783ddd4ff1db01` (PR #17).

## Rules for the tester / Studio AI

- This is a TEST-ONLY task.
- Do not edit code.
- Do not create branches, commits, PRs, or generated files.
- Do not change Firebase, Railway, Vercel, Cloudflare, DNS, environment variables, Firestore rules, or authentication settings.
- Do not use a local preview as the final verdict. The production URL is authoritative for this test.
- Do not touch `src/routeTree.gen.ts`.
- If a test requires credentials or a real physical-device action that is unavailable, report it as BLOCKED. Do not fabricate a pass.
- For every failure, report device/browser, viewport/orientation, exact steps, expected result, actual result, and screenshot/console evidence when available.

## A. Responsive visual acceptance

Test at minimum these classes of devices/viewports:

1. Mobile portrait: approximately 360–430 CSS px wide.
2. Mobile landscape / short viewport.
3. Tablet portrait: approximately 768–1024 CSS px wide.
4. Tablet landscape.
5. Desktop smoke check.

For an active game screen verify:

- Opponent/player bars stay visually close to the chessboard on phones; there must not be a large empty vertical gap caused by the arena stretching to full screen height.
- The chessboard fits without horizontal clipping or unintended page scrolling.
- Safe-area padding does not hide controls on phones with display cutouts/home indicators.
- Tablet remains compact and balanced; the phone fix must not make tablet spacing worse.
- Rotate portrait -> landscape -> portrait and confirm layout recovers correctly.

## B. Khmer `អុក` check splash and emphasized Khmer display text

Create a real check position in at least one human game and one Play-vs-AI game.

Verify on mobile and tablet:

- Text shown is exactly `អុក`.
- Typeface is **Koulen**, not Moul and not the Vietnamese/Latin UI font.
- The visual treatment should feel like a large Khmer display / uppercase-like poster face. Khmer itself has no uppercase/lowercase distinction; the intended effect comes from Koulen's glyph design and large sizing.
- Font uses the native regular face (`font-weight: 400`) with `font-synthesis: none`; there must be no faux/synthetic bold.
- Mobile and tablet use the same display style; only scale adapts to available space.
- `អុក` remains deliberately large on both mobile and tablet, but does not clip badly on short phones/landscape.
- Existing prominent Khmer display classes used around splash/emphasis also render in Koulen at display size rather than collapsing to small body typography.
- Splash remains visible for roughly the intended 3-second event even if AI replies quickly.

## C. Launcher / Add-to-Home-Screen icon

The web/PWA launcher icon was cache-busted in PR #15 using the existing IconKitchen artwork and versioned filenames dated `20260904`.

Check Android Chrome and iOS Safari when available:

- Remove any OLD installed PWA/home-screen shortcut first if the OS keeps the previous icon.
- Reload the production site.
- Install/Add to Home Screen again.
- Confirm the launcher/home-screen icon matches the current IconKitchen artwork in the repository.
- Confirm the installed app opens `https://ouk.kuonkhmer.com/` and does not create a duplicate/broken app identity.

Also inspect the production manifest and confirm it references the versioned icon files:

- `/apple-touch-icon-20260904.png`
- `/icon-192-20260904.png`
- `/icon-512-20260904.png`
- `/icon-192-maskable-20260904.png`
- `/icon-512-maskable-20260904.png`

Note: the repository contains IconKitchen Android resources under `android/res`. Native APK launcher-icon verification is a separate build-pipeline check; do not claim the native APK icon is verified solely from the PWA test.

## D. Production auth smoke

Use two DISTINCT real Firebase accounts (Account A and Account B).

Verify on `https://ouk.kuonkhmer.com/`:

- Both accounts can sign in successfully.
- Reloading the page preserves a valid session as expected.
- No `auth/unauthorized-domain` error occurs.
- User identity/name/avatar is bound to the authenticated account, not freely spoofed client input.

## E. Human matchmaking

With Account A and Account B on separate browser contexts/devices:

- Enter the same online mode at nearly the same time.
- Confirm the two humans are matched to each other before AI fallback is used.
- Confirm both clients receive the same initial board/ruleset/clock state.
- Make legal moves from both sides and verify synchronized authoritative state.
- Attempt an illegal/wrong-turn move and confirm it is rejected without desync.

## F. Private room / PIN

- Account A creates a private room.
- Confirm a 6-digit PIN is shown.
- Account B joins with that PIN.
- Invalid PIN format must be rejected.
- A third participant must not be able to occupy a full room.
- Complete at least several moves and confirm state stays synchronized.

## G. Reconnect

During an active Account A vs Account B game:

- On one side, disable network / close the tab / simulate app sleep.
- Confirm the opponent is told the player disconnected, but the game is not instantly forfeited just for a transient disconnect.
- Reconnect using the normal application flow.
- Confirm the returning player restores the correct color, board, turn, clocks and last move.
- Confirm the stale socket cannot continue controlling the player after replacement.

## H. Draw / rematch / chat controls

- Send normal chat messages; verify both clients receive the same text/sender and very long/spam input is not accepted indefinitely.
- Offer draw, decline once, offer again, then accept; confirm both clients end with the same result.
- Request rematch from both sides; confirm a fresh board starts and colors swap.
- Repeated rapid control-event spam should not crash the server; rate limiting may return `RATE_LIMITED`.

## I. Real two-account ranked persistence

This is the key release test.

Use two DISTINCT Firebase UIDs. Record both users' current Firestore ranked fields before the match:

- `rating`
- `peakRating`
- `wins`
- `losses`
- `draws`
- `winStreak`
- `gamesPlayed`

Play a human-vs-human online game to a definitive result (normal finish or an intentional resignation after the game has clearly started).

Then inspect the named Firestore database:

`ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`

Required result:

- Winner stats update exactly once.
- Loser stats update exactly once.
- Rating deltas are plausible and opposite in direction.
- `gamesPlayed` increments exactly once for each player.
- Exactly ONE corresponding `match_history` document exists for that game instance.
- Refresh/reconnect/repeated game-over delivery must not produce duplicate history or double Elo changes.

Also confirm that two browser sessions using the SAME Firebase account do not get paired into a ranked human match with each other.

## J. AI fallback

Test with only one human searching:

- Human matchmaking remains first priority.
- If no compatible human appears, AI fallback starts after a randomized wait in the intended ~10–30 second range.
- Bot uses a human-like display name and randomized plausible rating.
- UI does not expose a visible `bot`/AI label in the online opponent payload.
- Bot move timing feels non-instant/natural.
- Bot match must NOT change ranked Elo/stats or create ranked `match_history` as a human match.

## K. Backend public endpoints

PR #15 minimized the backend health response. PR #17 added a primary-domain proxy for online count.

Check the **deployed production backend**, not only repository source:

- `/health` returns HTTP 200 with basic liveness data only: `status` and `timestamp`.
- `/health` must not expose `activePins`, room counts, socket mappings, matchmaking queue size, buffered log count, real online count, server label, or uptime.
- `https://ouk-khmer-backend-production.up.railway.app/api/online-count` returns JSON and remains real connected count + 50.
- `https://ouk.kuonkhmer.com/api/online-count` also returns the same JSON through the Vercel proxy added in PR #17.
- If `/health` still exposes old metrics or backend `/api/online-count` still returns 404, classify it as a **stale Railway deployment**, because current `main` already contains the corrected server routes.

## Final report format

Return one concise report with these sections:

- PASS
- FAIL
- BLOCKED
- Device matrix tested
- Ranked before/after values for Account A and Account B
- `match_history` verification result
- Launcher icon result on Android/iOS/PWA
- Screenshots / console errors for failures
- Final verdict: `RELEASE READY` or `NOT RELEASE READY`

Do not mark `RELEASE READY` while the two-account ranked persistence test is unverified or failed.
