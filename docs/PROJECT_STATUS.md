# Project Status

## Current hardening release

The security/ranked hardening work is implemented on `security-hardening-auth-ranked` and is intended to merge into `main` through a normal merge commit.

### Verified in repository CI

The Quality Gate runs the following on pull requests to `main`:

- `npm ci`
- `npm test`
- `npm run test:auth`
- `npm run check:assets`
- `npm run build`

The hardening branch passed all of these checks before merge.

### Security/ranked changes

- Firebase ID tokens are cryptographically verified on the backend against Google's Secure Token certificates and validated for issuer, audience, and expiry.
- Production does not accept development/test auth tokens.
- Matchmaking and private-room entry require a verified Firebase identity on the server.
- Public Socket.IO reconnect requires the server-issued match session token; reconnect-by-color is not accepted by the production handler.
- Client-side online Elo/stat writes have been removed.
- Human-vs-human ranked results are calculated by the backend and persisted atomically to Firestore when backend service-account credentials are configured.
- Bot fallback matches are intentionally unranked.
- Ranked result persistence is idempotent per game instance to prevent duplicate Elo updates.
- Firestore rules prevent clients from mutating ranked fields.

### Production configuration still required

Repository code cannot provision external platform secrets by itself. The production backend must have:

```text
FIREBASE_PROJECT_ID=project-by-khang
FIREBASE_SERVICE_ACCOUNT_JSON={...service account JSON...}
```

`FIREBASE_SERVICE_ACCOUNT_JSON` must remain backend-only. If it is absent, online gameplay continues but ranked persistence is skipped and logged.

`firestore.rules` must also be deployed to the intended Firebase project. The repository currently has no automatic Firestore-rules deployment workflow.

### Intentionally unchanged product behavior

- Online display count continues to use the requested `real + 50` presentation.
- AI fallback matchmaking remains enabled.
- Existing Folk / International / Blitz modes remain unchanged.
- Existing board/clock/AFK/gameplay engine logic is preserved.

### Deferred migration

The existing `/users/{uid}` collection remains the leaderboard source for compatibility. Splitting public leaderboard data from private account metadata is intentionally deferred to a dedicated data-migration release rather than being mixed into this hardening patch.
