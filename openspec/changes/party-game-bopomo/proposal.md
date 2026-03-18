## Why

This project transforms a blank Next.js 16 app into a multiplayer Bopomofo party game where players race to deduce each other's Chinese words by guessing phonetic components (注音符號). The Bopomofo (ㄅㄆㄇㄈ) system's unique structure—consonants, medials, finals, and tones—creates a rich deduction mechanic that rewards phonetic knowledge and lateral thinking.

## What Changes

- **BREAKING**: The entire application is replaced with a party game (existing blank `app/page.tsx` and `app/layout.tsx` are repurposed)
- Add real-time game room creation with host controls and topic/word-count configuration
- Add QR code invite system so players can join rooms from mobile devices
- Add per-player Chinese word submission with a structured Bopomofo input box (consonant + medial + final + tone grid)
- Add turn-based guessing mechanics: full-answer guesses (eliminates player on wrong guess) vs. phonetic-component guesses (reveals matched components globally across all players)
- Add real-time game state broadcasting via Socket.IO (player join/leave, turn progression, reveal/eliminate events)
- Add host display screen: word boxes appear (all hidden) once every player has submitted; correct full-answer guess reveals that player's entire word; eliminated player's word fully revealed; guessed bopomofo components revealed globally in every player's matching cells
- Add game-over detection (last player standing wins)

## Capabilities

### New Capabilities

- `game-room`: Room creation, room state management, host assignment, topic/word-count config, and room lifecycle (lobby → in-game → game-over)
- `player-session`: Player join via QR code link, player identity within a room, player elimination tracking
- `bopomofo-input`: Structured word input box UI with consonant/medial/final/tone cells per character; supports multi-character words (N rows = N characters)
- `game-turn`: Turn-based guessing loop — full-answer guess (correct → opponent's full word revealed + opponent eliminated, wrong → self eliminated) and phonetic-component guess (reveals that component globally in every living player's matching cells; no elimination)
- `realtime-sync`: Socket.IO server integration for broadcasting game events (player joined, answer submitted, guess made, bopomofo component revealed globally, full word revealed, player eliminated, game over)
- `reveal-state`: Tracks which bopomofo components have been globally guessed (shared set); per-player reveal state (word fully revealed on correct full-answer guess or on elimination); word boxes shown to all only after every player has submitted
- `qr-invite`: QR code generation for room join URL, displayed on host lobby screen

### Modified Capabilities

*(none — this is a greenfield game on a blank Next.js scaffold)*

## Impact

- **New dependencies**: `socket.io`, `socket.io-client`, `qrcode.react` (or `react-qr-code`)
- **New API routes**: `/api/socket` (Socket.IO upgrade endpoint), `/api/rooms` (room CRUD)
- **App Router pages**: `/` (home / create room), `/room/[id]` (host view), `/room/[id]/join` (player join), `/room/[id]/play` (player game screen)
- **In-memory or Redis game state**: Room map keyed by room ID (no database required for MVP)
- **No existing code is reused** — `app/page.tsx` and `app/layout.tsx` are fully replaced
