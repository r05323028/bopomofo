# Bopomo Party

![GitHub License](https://img.shields.io/github/license/r05323028/bopomofo)
![GitHub Release](https://img.shields.io/github/v/release/r05323028/bopomofo)

![Logo](docs/img/logo.png)

Realtime multiplayer Bopomofo party game built with Next.js 16,
TypeScript, and Socket.IO.

## Overview

Bopomo Party is a real-time room-based game where a host creates a room,
players join from their own devices, and everyone progresses through a
turn-based game flow over WebSockets.

## Screenshots

|Lobby|Player Joining|Playing|
|---|---|---|
|![Lobby](docs/img/lobby.png)|![Player join](docs/img/player_join.png)|![Playing](docs/img/playing.png)|

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS v4
- Socket.IO (`socket.io`, `socket.io-client`)
- `react-qr-code` (invite QR rendering)
- Vitest (test runner)

## Quick Start

```bash
npm install
npm run dev
```

The app starts on `http://localhost:3000` using a custom Node server
(`server.ts`).

## Available Scripts

```bash
npm run dev          # Start dev server (tsx server.ts)
npm run lint         # Run Biome checks
npm run format       # Format code with Biome
npm run build        # Build Next.js app + server
npm run build:server # Compile custom server (tsc -p tsconfig.server.json)
npm start            # Start production server (dist/server.js)
npm test             # Run Vitest
npm run test:stress  # Run stress tests only
```

## Gameplay Routes

- `/` — Create room
- `/room/[id]` — Host room (lobby + game board)
- `/room/[id]/join` — Player join page
- `/room/[id]/play` — Player turn interface

## Environment Variables

- `PORT` (optional): server port, default `3000`
- `HOSTNAME` (optional): hostname used in startup logs, default `localhost`

## Testing

### Stress Test Suite

The stress tests simulate a full multiplayer game session with 10 concurrent
players.

**Prerequisites**

- Dev server running on `http://localhost:3000`
- Dependencies installed via `npm install`

**Run stress tests**

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:stress
```

**Coverage includes**

- Room creation and multi-player join flow
- Full lifecycle from lobby to game-over
- Turn progression and guessing interactions
- Player elimination behavior
- Disconnect and reconnect handling
- WebSocket stability under load

**Test files**

- `__tests__/stress/game-flow.test.ts`
- `__tests__/stress/utils/GameSimulator.ts`
- `__tests__/stress/utils/PlayerSimulator.ts`
- `__tests__/stress/utils/helpers.ts`

## Deployment Notes

This project depends on a **custom long-running Node server** for Socket.IO.
Do not deploy it as a static/serverless-only Next.js target (for example,
Vercel's standard serverless model).

Recommended targets:

- Railway
- Render
- Fly.io
- VPS / Docker host
