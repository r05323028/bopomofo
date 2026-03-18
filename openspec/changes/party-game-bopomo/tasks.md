## 1. Project Setup & Custom Server

- [x] 1.1 Install dependencies: `socket.io`, `socket.io-client`, `tsx`, `react-qr-code`
- [x] 1.2 Create `server.ts` — custom Node.js server that attaches Next.js handler and Socket.IO to the same `http.Server`
- [x] 1.3 Update `package.json` scripts: `"dev": "tsx server.ts"`, `"start": "NODE_ENV=production node dist/server.js"`, add `"build:server": "tsc server.ts --outDir dist"`
- [x] 1.4 Update `tsconfig.json` to include `server.ts` and output to `dist/`

## 2. Game Room Manager (Server-side State)

- [x] 2.1 Define TypeScript types in `lib/game/types.ts`: `BopomofoCell`, `PlayerAnswer`, `Player`, `RoomRevealState`, `GameRoom`, `RoomPhase`
- [x] 2.2 Implement `lib/game/roomManager.ts` — singleton `GameRoomManager` class with: `createRoom`, `getRoom`, `addPlayer`, `submitAnswer`, `allPlayersSubmitted`, `startGame`, `eliminatePlayer`, `advanceTurn`, `cleanupExpiredRooms` (2-hour TTL)
- [x] 2.3 Add room cleanup timer in `roomManager.ts` using `setInterval` (check every 10 min)

## 3. Socket.IO Event Handlers (Server-side)

- [x] 3.1 Create `lib/game/socketHandlers.ts` — register all server-side Socket.IO handlers on the `io` instance
- [x] 3.2 Handle `join-room`: validate room exists, socket joins the Socket.IO room, emit `room-state` back to sender
- [x] 3.3 Handle `start-game`: validate host identity and all players submitted, transition to `in-game`, emit `game-started` + first `turn-started`
- [x] 3.4 Handle `component-guess`: validate active player, add symbol to `guessedComponents`, emit `component-guessed` to room
- [x] 3.5 Handle `answer-guess`: validate active player and target, evaluate guess, emit `answer-guessed`, emit `player-eliminated`, check win condition and emit `game-over` if needed
- [x] 3.6 Wire `socketHandlers.ts` into `server.ts`

## 4. Socket Client Singleton

- [x] 4.1 Create `lib/socket.ts` — module-level singleton `getSocket()` using `socket.io-client`; guard against React Strict Mode double-init
- [x] 4.2 Connect socket to server using relative URL (no hard-coded port)

## 5. Home Page — Room Creation

- [x] 5.1 Create `app/page.tsx` — form with topic input and word count selector (1–4)
- [x] 5.2 On submit, POST to `/api/rooms` (Next.js Route Handler) to create room server-side, redirect to `/room/[id]`
- [x] 5.3 Create `app/api/rooms/route.ts` — POST handler: calls `roomManager.createRoom`, returns `{ roomId }`
- [x] 5.4 Add client-side validation: non-empty topic, word count 1–4

## 6. Host View — `/room/[id]`

- [x] 6.1 Create `app/room/[id]/page.tsx` — "use client" component
- [x] 6.2 Connect socket, emit `join-room`, listen for `room-state` and all broadcast events
- [x] 6.3 Lobby phase: show room topic, player list with submission status indicators, QR code + join URL text, "Start Game" button (disabled until all players submitted)
- [x] 6.4 "Start Game" button: emit `start-game`; show error toast if blocked
- [x] 6.5 In-game phase: render word box grid for all players (see task 9), show turn indicator and active player name
- [x] 6.6 Game-over phase: show winner banner, all words fully revealed

## 7. QR Code Component

- [x] 7.1 Create `components/QRInvite.tsx` — renders `<QRCode>` from `react-qr-code` with `value={joinUrl}` and displays join URL as copyable text below

## 8. Player Join Page — `/room/[id]/join`

- [x] 8.1 Create `app/room/[id]/join/page.tsx` — "use client" component
- [x] 8.2 On mount: fetch room state via `GET /api/rooms/[id]`; if not found or not `lobby`, show error/redirect
- [x] 8.3 Create `app/api/rooms/[id]/route.ts` — GET handler: returns sanitized room info (phase, topic, wordCount, player names)
- [x] 8.4 Display name input + word input box component (see task 10)
- [x] 8.5 On submit: POST to `/api/rooms/[id]/join` with `{ displayName, answer: PlayerAnswer }`; store returned `playerId` in `sessionStorage`; redirect to `/room/[id]/play`
- [x] 8.6 Create `app/api/rooms/[id]/join/route.ts` — POST handler: validates display name uniqueness and answer completeness, calls `roomManager.addPlayer` + `roomManager.submitAnswer`, returns `{ playerId }`
- [x] 8.7 Client-side validation: block submit if any character cell or final slot empty; show per-row errors

## 9. Word Box Display Component (Host Screen)

- [x] 9.1 Create `components/WordBox.tsx` — receives `answer: PlayerAnswer`, `guessedComponents: Set<string>`, `fullyRevealed: boolean`
- [x] 9.2 Render N character rows; for each row show the Chinese character (always visible) and 4-slot Bopomofo grid
- [x] 9.3 Implement slot reveal logic: slot visible if `fullyRevealed || guessedComponents.has(slotValue)`
- [x] 9.4 Bopomofo grid layout per the spec: tone (top), initial (2nd), medial+tone side-by-side (3rd row), final alone (bottom)
- [x] 9.5 Hidden slots render as masked (e.g., grey box), revealed slots show the symbol

## 10. Word Input Box Component (Join Page)

- [x] 10.1 Create `components/WordInput.tsx` — receives `wordCount: number`, calls `onChange` with `PlayerAnswer`
- [x] 10.2 Render N rows; each row: large character text input (1-char max) + 4 clickable Bopomofo slot buttons
- [x] 10.3 Create `components/BopomofoPicker.tsx` — modal/overlay that shows symbol list for a given category (initial/medial/final/tone) with a clear option; calls `onSelect(symbol | null)`
- [x] 10.4 Wire picker to slot buttons: clicking a slot opens picker for that slot's category, selecting updates state
- [x] 10.5 Enforce single-character input: on change, retain only the first character typed

## 11. Player Play Page — `/room/[id]/play`

- [x] 11.1 Create `app/room/[id]/play/page.tsx` — "use client" component
- [x] 11.2 On mount: read `playerId` from `sessionStorage`; connect socket, emit `join-room`
- [x] 11.3 Receive `room-state` — if not in-game or player is eliminated, show waiting/eliminated state
- [x] 11.4 Show turn indicator: "Your turn" vs. "Waiting for [name]..."
- [x] 11.5 When it is this player's turn: show two mode buttons — "Guess a Bopomofo component" and "Guess a player's answer"
- [x] 11.6 Phonetic-component guess flow: show 45-symbol grid (initials 21 + medials 3 + finals 16 + tones 5), grey-out already-guessed symbols, emit `component-guess` on selection
- [x] 11.7 Full-answer guess flow: show player selector (non-eliminated, non-self), word input matching room's word count, emit `answer-guess` on submit
- [x] 11.8 Handle `player-eliminated` event: if own ID, show elimination message; if other player, update UI
- [x] 11.9 Handle `game-over` event: show result screen with winner and all revealed words

## 12. Real-time State Integration (Client)

- [x] 12.1 Create `lib/useRoomState.ts` — custom hook that manages socket subscriptions and returns current room state (`phase`, `players`, `activePlayerId`, `guessedComponents`, `playerWordRevealed`)
- [x] 12.2 `useRoomState` subscribes to: `room-state`, `player-joined`, `answer-submitted`, `game-started`, `turn-started`, `component-guessed`, `answer-guessed`, `player-eliminated`, `game-over`
- [x] 12.3 Use `useRoomState` in host view (`/room/[id]`) and player view (`/room/[id]/play`)

## 13. Error & Edge Case Handling

- [x] 13.1 Host view: if `room-state` is not received within 5 s, show "Room not found" and link to home
- [x] 13.2 Join page: handle 404 from `/api/rooms/[id]` (show "Room not found") and non-lobby phase (show "Game already started")
- [x] 13.3 Play page: if `playerId` not in `sessionStorage`, redirect to `/room/[id]/join`
- [x] 13.4 Socket reconnect: on reconnect event, re-emit `join-room` with stored `roomId` + `playerId`

## 14. Styling & Polish

- [x] 14.1 Apply Tailwind CSS layout to home page (centered form, clean card)
- [x] 14.2 Style host view: two-column lobby (player list left, QR right); in-game grid of word boxes
- [x] 14.3 Style join page: full-width word input box, large character cells, clearly labeled Bopomofo slots
- [x] 14.4 Style play page: prominent turn indicator, large guess mode buttons, symbol grid with clear disabled state
- [x] 14.5 Responsive design: all pages usable on mobile viewport (players join on mobile via QR)

## 15. Build & Deployment Prep

- [x] 15.1 Verify `npm run build` (Next.js) + `tsc server.ts` both pass with no errors
- [x] 15.2 Update `README.md`: document `npm run dev` (custom server), deployment target (Railway/Render/Fly.io, not Vercel), env vars if any
- [x] 15.3 Add `Dockerfile` or `railway.toml` / `render.yaml` for one-click deploy (optional but recommended)
