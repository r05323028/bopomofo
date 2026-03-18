## ADDED Requirements

### Requirement: Player can join a room via the join link
The system SHALL allow any user to join an existing room in `lobby` phase by navigating to `/room/[id]/join`, entering a display name, and submitting their answer word with Bopomofo components.

#### Scenario: Successful join
- **WHEN** a user navigates to `/room/[id]/join` for a room in `lobby` phase, enters a display name, fills in the word input box, and submits
- **THEN** the system SHALL add the player to the room, assign them a unique player ID, persist their answer server-side, and redirect them to `/room/[id]/play`

#### Scenario: Join attempt on non-existent room
- **WHEN** a user navigates to `/room/[id]/join` for a room ID that does not exist
- **THEN** the system SHALL display an error message and SHALL NOT create a new room

#### Scenario: Join attempt on in-game room
- **WHEN** a user navigates to `/room/[id]/join` for a room in `in-game` or `game-over` phase
- **THEN** the system SHALL display a message indicating the game has already started and prevent joining

#### Scenario: Duplicate display name
- **WHEN** a user attempts to join with a display name already taken in that room
- **THEN** the system SHALL reject the submission and prompt for a different name

---

### Requirement: Player identity persists within a session
The system SHALL assign each player a session-scoped ID upon joining. This ID SHALL be stored client-side (e.g., sessionStorage) so the player can reconnect to the same room without re-entering their name.

#### Scenario: Player refreshes the play page
- **WHEN** a player on `/room/[id]/play` refreshes the browser
- **THEN** the system SHALL restore their player identity and game state using the stored player ID without requiring re-submission

---

### Requirement: Player elimination is tracked server-side
The system SHALL maintain an `isEliminated` flag per player. Eliminated players SHALL remain visible in the room state but SHALL NOT take further turns.

#### Scenario: Player is eliminated
- **WHEN** a player is eliminated (wrong full-answer guess or targeted by a correct full-answer guess)
- **THEN** the system SHALL set their `isEliminated` flag to `true` and broadcast the updated player list to all room participants

#### Scenario: Eliminated player's turn is skipped
- **WHEN** the turn order reaches a player with `isEliminated: true`
- **THEN** the system SHALL automatically advance to the next non-eliminated player

---

### Requirement: Host identity is fixed for the room lifetime
The system SHALL designate the room creator as host. The host role SHALL NOT transfer if the host disconnects.

#### Scenario: Host disconnects temporarily
- **WHEN** the host's socket disconnects
- **THEN** the system SHALL retain their host designation and allow them to reconnect and resume control
