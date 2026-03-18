## ADDED Requirements

### Requirement: Host can create a game room
The system SHALL allow any user to create a new game room by providing a topic string and a word count (number of Chinese characters per answer). Upon creation the system SHALL assign the creator as host, generate a unique room ID, and initialize the room in the `lobby` phase.

#### Scenario: Successful room creation
- **WHEN** a user submits the create-room form with a valid topic and word count (1–4 characters)
- **THEN** the system creates a room with a unique ID, sets phase to `lobby`, assigns the creator as host, and redirects them to `/room/[id]`

#### Scenario: Word count out of range
- **WHEN** a user submits a word count less than 1 or greater than 4
- **THEN** the system SHALL reject the request and display a validation error without creating a room

#### Scenario: Empty topic
- **WHEN** a user submits a create-room form with a blank topic
- **THEN** the system SHALL reject the request and display a validation error

---

### Requirement: Room has a defined lifecycle
The system SHALL enforce a three-phase room lifecycle: `lobby` → `in-game` → `game-over`. Phase transitions SHALL only occur through defined events.

#### Scenario: Transition from lobby to in-game
- **WHEN** the host presses "Start Game" and all players have submitted their answers
- **THEN** the room phase transitions to `in-game` and the host screen reveals all hidden word boxes

#### Scenario: Start blocked if not all players submitted
- **WHEN** the host presses "Start Game" but one or more players have not yet submitted their answer
- **THEN** the system SHALL prevent the transition and indicate which players have not submitted

#### Scenario: Transition to game-over
- **WHEN** only one active (non-eliminated) player remains
- **THEN** the room phase transitions to `game-over` and the system broadcasts the winner

---

### Requirement: Room state is accessible to all participants
The system SHALL maintain authoritative room state on the server. Clients SHALL receive the full current room state upon joining or reconnecting.

#### Scenario: Host reconnects mid-game
- **WHEN** the host's socket disconnects and reconnects using the same room ID
- **THEN** the system SHALL restore the full current game state to the host client

#### Scenario: Player reconnects mid-game
- **WHEN** a player's socket disconnects and reconnects using the same room ID and player ID
- **THEN** the system SHALL restore the current game state to that player without altering game progression

---

### Requirement: Rooms are cleaned up after inactivity
The system SHALL remove rooms from memory after 2 hours from creation, regardless of game state, to prevent unbounded memory growth.

#### Scenario: Room expires
- **WHEN** 2 hours have elapsed since a room was created
- **THEN** the system SHALL delete the room from the in-memory store and disconnect all associated sockets
