# Bopomo Party

![GitHub License](https://img.shields.io/github/license/r05323028/bopomofo)
![GitHub Release](https://img.shields.io/github/v/release/r05323028/bopomofo)

Realtime multiplayer Bopomofo party game built with Next.js 16 and Socket.IO.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript (strict)
- Tailwind CSS v4
- Socket.IO (`socket.io`, `socket.io-client`)
- `react-qr-code` for invite QR rendering

## Local Development

```bash
npm install
npm run dev
```

The app runs on `http://localhost:3000` with a custom Node server (`server.ts`).

## Scripts

```bash
npm run dev          # tsx server.ts
npm run lint         # biome check
npm run format       # biome format --write
npm run build        # next build + server build
npm run build:server # tsc -p tsconfig.server.json
npm start            # NODE_ENV=production node dist/server.js
npm test             # run vitest tests
npm run test:stress  # run stress tests only
```

## Gameplay Routes

- `/` - create room
- `/room/[id]` - host room (lobby + board)
- `/room/[id]/join` - player join form
- `/room/[id]/play` - player turn interface

## Deployment Notes

This project uses a **custom Node server** for Socket.IO. Do not deploy to Vercel.

Use platforms that support long-lived Node processes and WebSockets:

- Railway
- Render
- Fly.io
- VPS / Docker host

## Environment Variables

- `PORT` (optional) - server port, default `3000`
- `HOSTNAME` (optional) - hostname used in startup logs, default `localhost`

## Testing

### Stress Tests

The project includes comprehensive stress tests that simulate full multiplayer game sessions with 10 concurrent players.

**Prerequisites:**
- Server must be running on `http://localhost:3000`
- Run `npm install` to install test dependencies (Vitest)

**Running stress tests:**

```bash
# In terminal 1: Start the dev server
npm run dev

# In terminal 2: Run stress tests
npm run test:stress
```

**What the stress tests cover:**
- Room creation and player joining (10 players)
- Full game lifecycle from lobby to game-over
- Turn-based gameplay with component guessing
- Player elimination mechanics
- Disconnect/reconnect behavior (1-2 reconnections per player)
- WebSocket connection stability under load

**Test structure:**
- `__tests__/stress/game-flow.test.ts` - Main test suite
- `__tests__/stress/utils/GameSimulator.ts` - Game orchestration logic
- `__tests__/stress/utils/PlayerSimulator.ts` - Individual player simulation
- `__tests__/stress/utils/helpers.ts` - Test utilities

**Expected output:**
- Test duration: ~30-60 seconds
- Console logs showing game progress (turns, eliminations)
- Final statistics: winner, total turns, reconnection counts
- All tests should pass with final game state: `phase: "game-over"` and ≤1 alive player
