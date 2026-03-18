## ADDED Requirements

### Requirement: Players take turns in a fixed rotation
The system SHALL advance turns in the order players joined the room, skipping eliminated players. The current turn's active player SHALL be tracked in room state.

#### Scenario: First turn starts
- **WHEN** the room transitions to `in-game` phase
- **THEN** the system SHALL set the active player to the first non-eliminated player in join order and broadcast `turn-started`

#### Scenario: Turn advances after a guess
- **WHEN** the active player completes a guess (phonetic-component or full-answer)
- **THEN** the system SHALL advance the active player to the next non-eliminated player in join order and broadcast `turn-started`

#### Scenario: Eliminated player is skipped
- **WHEN** the next player in rotation has `isEliminated: true`
- **THEN** the system SHALL skip them and continue to the next non-eliminated player

---

### Requirement: On their turn, a player chooses between two guess modes
The system SHALL present the active player with two mutually exclusive options each turn: guess a Bopomofo component, or guess another player's full answer. The player MUST choose exactly one per turn.

#### Scenario: Phonetic-component guess chosen
- **WHEN** the active player selects "guess a Bopomofo component" and picks a symbol
- **THEN** the system SHALL record the guess, add the symbol to `guessedComponents`, reveal matching cells globally, and advance the turn

#### Scenario: Full-answer guess chosen
- **WHEN** the active player selects "guess a player's answer", picks a target player, and enters a word
- **THEN** the system SHALL evaluate the guess and apply the appropriate outcome (see reveal-state spec)

---

### Requirement: Phonetic-component guess reveals matching cells globally
A phonetic-component guess SHALL add the guessed symbol to `guessedComponents`. No player is eliminated. The turn then advances.

#### Scenario: Matching symbol guessed
- **WHEN** the active player guesses symbol X and X appears in one or more cells across all players' words
- **THEN** those cells SHALL be revealed on the host screen for all observers, symbol X added to `guessedComponents`, and turn advances

#### Scenario: Non-matching symbol guessed
- **WHEN** the active player guesses symbol X and X does not appear in any player's word
- **THEN** X is still added to `guessedComponents` (no cells revealed), turn advances

#### Scenario: Already-guessed symbol
- **WHEN** the active player attempts to guess a symbol already in `guessedComponents`
- **THEN** the system SHALL reject the input and prompt them to choose a different symbol without consuming their turn

---

### Requirement: Full-answer guess eliminates the guesser or the target
A full-answer guess compares the entered word (case-insensitive character match) against the target player's stored answer.

#### Scenario: Correct full-answer guess
- **WHEN** the active player guesses a target player's word and the entered characters match the target's submitted characters exactly
- **THEN** the target player SHALL be eliminated (`isEliminated: true`), their full word revealed, and the turn advances to the next non-eliminated player

#### Scenario: Wrong full-answer guess
- **WHEN** the active player guesses a target player's word and the entered characters do NOT match
- **THEN** the active player (guesser) SHALL be eliminated (`isEliminated: true`), their full word revealed, and the turn advances

#### Scenario: Guesser cannot target themselves
- **WHEN** the active player attempts to select themselves as the target for a full-answer guess
- **THEN** the system SHALL reject the selection and require a different target

#### Scenario: Guesser cannot target an already-eliminated player
- **WHEN** the active player attempts to target a player with `isEliminated: true`
- **THEN** the system SHALL reject the selection and require a non-eliminated target

---

### Requirement: Game ends when only one non-eliminated player remains
The system SHALL monitor active player count after every elimination. When only one player remains active, the game SHALL end.

#### Scenario: Last player standing
- **WHEN** an elimination event reduces the non-eliminated player count to 1
- **THEN** the system SHALL transition the room to `game-over`, broadcast the winner's identity, and fully reveal all remaining hidden words
