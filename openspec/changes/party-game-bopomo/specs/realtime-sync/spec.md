## ADDED Requirements

### Requirement: All game state changes are broadcast via Socket.IO events
The server SHALL emit Socket.IO events for every state mutation. Clients SHALL update their local UI reactively from these events without polling.

#### Scenario: Player joins room
- **WHEN** a player successfully joins a room
- **THEN** the server SHALL emit `player-joined` to all sockets in the room with the updated player list

#### Scenario: Player submits answer
- **WHEN** a player submits their word during the lobby phase
- **THEN** the server SHALL emit `answer-submitted` to all sockets in the room with the player ID (answer content NOT included — kept secret)

#### Scenario: Game starts
- **WHEN** the host triggers the `lobby` → `in-game` transition
- **THEN** the server SHALL emit `game-started` to all sockets in the room with the initial turn state

#### Scenario: Turn starts
- **WHEN** the active player changes (at game start or after a guess)
- **THEN** the server SHALL emit `turn-started` to all sockets in the room with the active player ID

#### Scenario: Phonetic-component guessed
- **WHEN** the active player makes a phonetic-component guess
- **THEN** the server SHALL emit `component-guessed` to all sockets in the room with the guessed symbol and the full updated `guessedComponents` set

#### Scenario: Full-answer guess made
- **WHEN** the active player makes a full-answer guess
- **THEN** the server SHALL emit `answer-guessed` to all sockets in the room with the guesser ID, target ID, and outcome (`correct` or `wrong`)

#### Scenario: Player eliminated
- **WHEN** a player is eliminated
- **THEN** the server SHALL emit `player-eliminated` to all sockets in the room with the eliminated player's ID and their fully revealed word

#### Scenario: Game over
- **WHEN** the room transitions to `game-over`
- **THEN** the server SHALL emit `game-over` to all sockets in the room with the winner's player ID and all players' fully revealed words

---

### Requirement: Clients receive full state on connect or reconnect
The server SHALL send the complete current room state to any client that connects or reconnects, so late-joiners and reconnecting clients converge to the correct UI without missing events.

#### Scenario: New socket connects to an existing room
- **WHEN** a socket emits `join-room` with a valid room ID
- **THEN** the server SHALL respond with a `room-state` event containing the full current room snapshot (phase, players, reveal state, turn order, active player)

#### Scenario: Reconnecting socket
- **WHEN** a socket reconnects and emits `join-room` with a room ID and player ID already in that room
- **THEN** the server SHALL restore the player's socket binding and emit `room-state` with the full current snapshot

---

### Requirement: Client-emitted events are validated server-side
The server SHALL validate all incoming Socket.IO events. Events from non-active players, out-of-phase actions, or invalid data SHALL be silently ignored or result in an error event back to the sender.

#### Scenario: Non-active player attempts to guess
- **WHEN** a socket emits `component-guess` or `answer-guess` and the emitting player is not the current active player
- **THEN** the server SHALL ignore the event and optionally emit `error` back to that socket

#### Scenario: Action during wrong phase
- **WHEN** a socket emits a guess event while the room is in `lobby` or `game-over` phase
- **THEN** the server SHALL ignore the event

---

### Requirement: Socket.IO event catalogue (server → client)

| Event | Payload | When emitted |
|---|---|---|
| `room-state` | Full room snapshot | On join/reconnect |
| `player-joined` | `{ player }` | New player joins |
| `answer-submitted` | `{ playerId }` | Player submits word |
| `game-started` | `{ activePlayerId, turnOrder }` | Game begins |
| `turn-started` | `{ activePlayerId }` | Turn advances |
| `component-guessed` | `{ symbol, guessedComponents }` | Phonetic-component guess |
| `answer-guessed` | `{ guesserId, targetId, outcome }` | Full-answer guess result |
| `player-eliminated` | `{ playerId, revealedWord }` | Player eliminated |
| `game-over` | `{ winnerId, allWords }` | Last player standing |
| `error` | `{ message }` | Invalid action |

### Requirement: Socket.IO event catalogue (client → server)

| Event | Payload | When emitted |
|---|---|---|
| `join-room` | `{ roomId, playerId? }` | On page load |
| `start-game` | `{ roomId }` | Host starts game |
| `component-guess` | `{ roomId, symbol }` | Active player guesses symbol |
| `answer-guess` | `{ roomId, targetId, word }` | Active player guesses full answer |
