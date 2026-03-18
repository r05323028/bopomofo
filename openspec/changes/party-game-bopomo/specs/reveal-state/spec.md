## ADDED Requirements

### Requirement: Cell-level reveal is computed from the global guessed component set
The system SHALL compute which Bopomofo slots are visible on the host screen by comparing each cell's values against `guessedComponents`. A slot is revealed if its symbol has been guessed.

#### Scenario: Initial render — no components guessed yet
- **WHEN** the game first transitions to `in-game` and `guessedComponents` is empty
- **THEN** all Bopomofo slots on the host screen SHALL be hidden (rendered as blank/masked)

#### Scenario: Symbol in guessedComponents matches a cell slot
- **WHEN** a symbol X is in `guessedComponents` and a player's cell has `initial === X` (or medial, final, or tone)
- **THEN** that slot SHALL be rendered as visible on the host screen for all observers

#### Scenario: Symbol in guessedComponents does not match any cell
- **WHEN** a symbol X is added to `guessedComponents` but no player's cell contains X
- **THEN** no new cells are revealed; all previously revealed cells remain visible

#### Scenario: Multiple slots in the same cell revealed independently
- **WHEN** symbols ㄇ and ˋ are both in `guessedComponents` and a cell has `initial=ㄇ, tone=ˋ`
- **THEN** both slots of that cell SHALL be independently visible; unrevealed slots in the same cell remain hidden

---

### Requirement: Full-word reveal overrides cell-level reveal
When a player's word is fully revealed (`playerWordRevealed[id] === true`), ALL slots of ALL their cells SHALL be rendered as visible, regardless of `guessedComponents`.

#### Scenario: Eliminated player's word is fully revealed
- **WHEN** a player is eliminated (either as target of a correct full-answer guess or as the wrong guesser)
- **THEN** `playerWordRevealed[playerId]` SHALL be set to `true` and all their cells SHALL render fully visible on the host screen

#### Scenario: Game-over reveals all remaining words
- **WHEN** the room transitions to `game-over`
- **THEN** `playerWordRevealed[id]` SHALL be set to `true` for all players and all word boxes SHALL render fully visible

---

### Requirement: Character cells (Chinese characters) are never hidden
The large character cell (left side of each word row) SHALL always be visible on the host screen regardless of reveal state. Only the Bopomofo slot grid on the right is subject to reveal rules.

#### Scenario: Host screen during in-game phase
- **WHEN** the room is in `in-game` phase
- **THEN** all players' Chinese characters SHALL be visible, but their Bopomofo slots SHALL be revealed only according to `guessedComponents` or `playerWordRevealed`

---

### Requirement: Reveal state is authoritative on the server and synced to all clients
`guessedComponents` and `playerWordRevealed` SHALL live in server-side room state. Clients SHALL receive updates via `component-guessed` and `player-eliminated` / `game-over` events and render accordingly.

#### Scenario: Late-joining observer (host reconnect)
- **WHEN** the host reconnects mid-game
- **THEN** the `room-state` event SHALL include the full current `guessedComponents` set and `playerWordRevealed` map so the host's screen re-renders in the correct partial-reveal state
