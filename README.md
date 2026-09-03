# Khmer Ouk Chaktrang (អុកចត្រង្គ) — Welcome Portal & Engine

A Cambodian Khmer Chess (_Ouk Chatrang_ / _Ouk Chaktrang_) application featuring Folk and International rules, offline AI, real-time online multiplayer, traditional audio, and Khmer Angkor-inspired design.

> **Current deployment and handoff state:** read [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) before changing production, auth, ranked persistence, Vercel routing, Firebase, or DNS configuration.

## Production

- Primary web URL: `https://ouk.kuonkhmer.com/`
- Vercel fallback URL: `https://ouk-khmer-online.vercel.app/`

## Features & Visual Identity

- **Cinematic Splash Screen**
  - Angkor-inspired artwork, Khmer ornamentation, mascot, and traditional typography.
  - Day/night-aware presentation and replay support from Settings.
- **Authentic Rules & AI Engine**
  - Folk Rules (King jump, Neang 2-step first move).
  - International Rules (Touch-move, chess clock, tournament scoring).
  - Web Worker minimax AI with alpha-beta pruning.
  - _Viel K'dar_ and _Viel L'koun_ honor counting systems.
- **Online Multiplayer**
  - Server-authoritative board, move validation, clocks, AFK handling, draw/resign/rematch, and reconnect sessions.
  - Firebase-authenticated matchmaking and private rooms.
  - Human-vs-human ranked results are designed to be persisted authoritatively by the backend; bot fallback matches are unranked.
- **Cultural Design System**
  - Ada Gold & Obsidian, Ada Red, and Traditional Cambodian SVG piece sets.
  - Traditional Khmer BGM tracks.
  - Multi-language support including Khmer, English, Vietnamese, French, Thai, and Chinese where available.

## Development

```sh
npm ci

# Core Khmer chess engine tests
npm test

# Auth/security regression tests
npm run test:auth

# Verify binary/static assets
npm run check:assets

# Build client SPA + Socket.IO backend bundle
npm run build
```

## Online Backend Configuration

The Socket.IO backend is stateful and should run on a persistent Node.js service such as Railway rather than a serverless request/response function.

Production authentication verifies Firebase ID tokens cryptographically. Configure the backend project explicitly when needed:

```text
FIREBASE_PROJECT_ID=project-by-khang
```

Authoritative Elo/stat and `match_history` persistence requires a Google/Firebase service account with Firestore write access:

```text
FIREBASE_SERVICE_ACCOUNT_JSON={...service account JSON...}
```

If the service-account variable is absent, gameplay continues but authoritative ranked persistence is skipped and logged. Never expose this service-account JSON to the frontend or commit it to the repository.

## Firestore Rules

`firestore.rules` is the repository source of truth for client permissions. Changes to this file are not automatically deployed by the current repository workflows; deploy the rules to the intended Firebase project as part of the production release process.

## Repository Safety

This repository is connected to Lovable. Do not rewrite already-published Git history with force pushes, rebases, amended pushed commits, or squashed pushed history. See `AGENTS.md`.
