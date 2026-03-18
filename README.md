# Bopomo Party

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
