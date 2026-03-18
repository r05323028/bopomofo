## Context

This is a greenfield multiplayer party game on a blank Next.js 16 App Router scaffold. The game revolves around the Bopomofo (注音符號) phonetic system — players submit Chinese words, and opponents race to deduce them by guessing phonetic components (consonant/medial/final/tone) or making full-answer guesses. The application requires persistent WebSocket connections for real-time game state, which fundamentally shapes the architecture.

Current state: `app/page.tsx` and `app/layout.tsx` are blank Next.js defaults. No existing game logic, no database, no auth.

## Goals / Non-Goals

**Goals:**
- Real-time multiplayer game playable from mobile via QR code invite
- Turn-based guessing with two modes: phonetic-component guess (global reveal, no elimination) and full-answer guess (correct → eliminate, wrong → self-eliminate)
- Host screen showing all players' hidden word boxes with progressively revealed Bopomofo cells
- No database — in-memory game state for MVP
- Works on any self-hosted Node.js server (Railway, Render, VPS)

**Non-Goals:**
- Vercel deployment (Socket.IO custom server is incompatible with Vercel's serverless runtime)
- Persistence across server restarts (no Redis in MVP)
- Authentication or user accounts
- Mobile native app
- Automatic Bopomofo decomposition of submitted words (players manually fill in their own Bopomofo)

## Decisions

### D1: Custom Node.js server for Socket.IO (not API route handler)

**Decision**: Replace `next dev` / `next start` with a `server.ts` custom server that mounts both Next.js and Socket.IO on the same HTTP server.

**Why**: The `/api/socket` route handler approach does not work with Socket.IO in Next.js App Router — API routes run in serverless/edge contexts that are ephemeral and cannot maintain persistent WebSocket connections. The official Socket.IO documentation explicitly recommends the custom server pattern for Next.js App Router. Next.js 16 does have an experimental `webSockets` flag (PR #89320), but it targets the native WebSocket API, not Socket.IO, and is not production-ready.

**Alternative considered**: Separate standalone Express + Socket.IO server alongside Next.js on a different port — rejected because it adds CORS complexity and requires two deployments.

**Trade-off**: Loses Next.js Automatic Static Optimization and serverless function splitting. Acceptable for a game where all pages are dynamic.

**`package.json` script changes**:
```json
{
  "dev": "tsx server.ts",
  "start": "NODE_ENV=production node dist/server.js"
}
```

---

### D2: In-memory game state via a singleton `GameRoomManager`

**Decision**: All game state lives in a module-level singleton `GameRoomManager` class in `lib/game/roomManager.ts`. No external store.

**Why**: MVP doesn't need persistence. A singleton is simple, zero-latency, and works cleanly alongside Socket.IO event handlers in the same Node.js process. Rooms are cleaned up after a configurable TTL (e.g., 2 hours after creation or after game-over).

**Alternative considered**: Redis — rejected for MVP complexity. The architecture is designed so Redis can be dropped in later by swapping the `GameRoomManager` implementation.

**Socket.IO rooms vs. game state**: Socket.IO's built-in `socket.join(roomId)` handles message routing only. Game state (players, words, reveal flags, turn order, eliminations) lives in `GameRoomManager`, not in Socket.IO's room metadata.

---

### D3: Bopomofo data model — 4-cell structure per character, manually entered

**Decision**: Each submitted character is represented as `BopomofoCell`:
```typescript
type BopomofoCell = {
  initial: string | null;   // 21 consonants: ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ
  medial: string | null;    // 3 medials: ㄧㄨㄩ
  final: string | null;     // 16 finals: ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ
  tone: string | null;      // 5 tones: null(1st) ˊ ˇ ˋ ˙
};
```

Players type the Chinese character in the large left cell, then manually pick each Bopomofo component from a picker UI. No automatic decomposition — the player fills in their own answer, which is the game's natural mechanic (players know their word's pronunciation).

**Why manual input**: Automatic decomposition via libraries like `pinyin` + `pinyin-to-bopomofo` would remove agency. Players defining their own phonetics is intentional (e.g., nicknames, made-up words, or slang are valid topics).

**Total distinct guessable symbols**: 21 initials + 3 medials + 16 finals + 5 tones = **45 symbols**. Any of these can be guessed in a phonetic-component guess turn.

---

### D4: Global reveal state — guessed component set + per-player word reveal

**Decision**: Two separate reveal structures in room state:

```typescript
type RoomRevealState = {
  // Global: which Bopomofo symbols have been guessed so far
  guessedComponents: Set<string>;  // e.g., new Set(['ㄅ', 'ˋ'])

  // Per-player: is their entire word revealed?
  playerWordRevealed: Record<string, boolean>;  // playerId → true/false
};
```

When a phonetic-component guess is made, the symbol is added to `guessedComponents` regardless of whether it actually appears in any word — it's "information shared with the table." The UI then computes which cells to reveal by checking each cell's values against `guessedComponents`.

A player's word is fully revealed (`playerWordRevealed[id] = true`) when:
1. A correct full-answer guess targets them, OR
2. They are eliminated (wrong full-answer guess or last surviving player)

Word boxes (all hidden) are only rendered on the host screen after `room.phase === 'in-game'` (triggered when all players have submitted).

---

### D5: Page routing — host view vs. player view as separate routes

**Decision**:

| Route | Who sees it | Purpose |
|---|---|---|
| `/` | Anyone | Home: create room form |
| `/room/[id]` | Host only | Lobby → game host view (QR code + all word boxes) |
| `/room/[id]/join` | New players | Name entry + word/Bopomofo submission form |
| `/room/[id]/play` | Active players | Player's turn interface (guess mode picker) |

Host view and player view are intentionally separate because they show different information (host sees all hidden words; players see only the guess interface and their own word).

**Alternative considered**: Single route with role-based rendering — rejected because it complicates state management and risks leaking hidden data through client-side code inspection.

---

### D6: QR code generation — client-side only, no server involvement

**Decision**: Use `react-qr-code` (or `qrcode.react`) to render a QR code on the host page from the room join URL (`/room/[id]/join`). No server-side QR generation needed.

**Why**: The room ID is known on the client after room creation. A pure client-side library keeps it simple.

---

### D7: React Strict Mode / duplicate socket connections — singleton socket client

**Decision**: Wrap the `socket.io-client` instance in a module-level singleton (`lib/socket.ts`):
```typescript
let socket: Socket | null = null;
export const getSocket = () => {
  if (!socket) socket = io();
  return socket;
};
```

**Why**: React 18+ Strict Mode double-invokes effects in development, which would create duplicate socket connections without this guard.

---

## Risks / Trade-offs

- **Single server process is a single point of failure** → Acceptable for a party game MVP; add Redis + multiple instances post-MVP if needed
- **In-memory state lost on crash/restart** → Active games die on server restart; mitigated by keeping games short (party game context)
- **Vercel not supported** → Document this clearly; target Railway, Render, or Fly.io for deployment
- **No auth on room creation** → Anyone with the room ID can join; mitigated by short-lived rooms and the party-game context where participants are known
- **45-symbol guess space is large** → By design — the deduction challenge is the game mechanic
- **Manual Bopomofo input requires players to know phonetics** → By design — the game targets Mandarin speakers familiar with 注音
- **Hot-reload in dev restarts Socket.IO server** → Use `tsx --watch server.ts` carefully; socket reconnection logic on client handles brief disconnects
