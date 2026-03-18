## ADDED Requirements

### Requirement: Word input box renders one row per character
The system SHALL render the word input box with exactly N rows, where N equals the room's configured word count. Each row represents one Chinese character and contains a large character cell on the left and a 4-slot Bopomofo cell grid on the right.

#### Scenario: Single-character word
- **WHEN** the room word count is 1
- **THEN** the word input box SHALL display exactly one row with one character cell and one Bopomofo grid

#### Scenario: Multi-character word
- **WHEN** the room word count is N (2–4)
- **THEN** the word input box SHALL display exactly N rows, each with its own character cell and Bopomofo grid

---

### Requirement: Each row's Bopomofo grid has four positional slots
Each character row SHALL contain four fixed-position slots arranged as: tone (top), initial/consonant (second), medial (third row, left slot), final (third row, right slot — but see layout note), final (bottom). The layout MUST match the positional grid shown in the design specification:

```
+--------------------++---+
|                    ||tone|
|                    |+---+
|                    |+---+
|                    ||init|
|      character     |+---+
|                    |+---++---+
|                    ||med ||tone|   ← medial left, TONE right (not final!)
|                    |+---++---+
|                    |+---+
|                    ||fin |        ← final alone at bottom
+--------------------++---+
```

Each slot SHALL display the selected Bopomofo symbol or remain empty if not set.

#### Scenario: All four slots filled (e.g., 麵 = ㄇ + ㄧ + ㄢ + ˋ)
- **WHEN** initial=ㄇ, medial=ㄧ, final=ㄢ, tone=ˋ
- **THEN** the grid SHALL display ˋ in the tone slot, ㄇ in the initial slot, ㄧ and ˋ side-by-side in the medial/tone row, ㄢ alone in the final slot

#### Scenario: No medial (e.g., 包 = ㄅ + ㄠ + 1st tone)
- **WHEN** initial=ㄅ, medial=null, final=ㄠ, tone=null (1st tone, no mark)
- **THEN** the grid SHALL display ㄅ in the initial slot, ㄠ alone in the final slot, tone slot empty

#### Scenario: No initial (e.g., vowel-initial character)
- **WHEN** initial=null, medial=null, final=ㄚ, tone=˙
- **THEN** the grid SHALL display ˙ in the tone slot, initial slot empty, ㄚ alone in the final slot

---

### Requirement: Player selects Bopomofo components via a picker
The system SHALL provide a symbol picker UI for each slot. Tapping/clicking a slot SHALL open the picker for that slot's symbol category (initials, medials, finals, or tones). Selecting a symbol SHALL update the slot and close the picker.

#### Scenario: Open initial picker
- **WHEN** a player taps the initial slot of a row
- **THEN** the system SHALL display all 21 initials (ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ) for selection

#### Scenario: Open medial picker
- **WHEN** a player taps the medial slot of a row
- **THEN** the system SHALL display the 3 medials (ㄧㄨㄩ) plus a "clear" option

#### Scenario: Open final picker
- **WHEN** a player taps the final slot of a row
- **THEN** the system SHALL display all 16 finals (ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ) for selection

#### Scenario: Open tone picker
- **WHEN** a player taps the tone slot of a row
- **THEN** the system SHALL display 5 tone options: ˊ ˇ ˋ ˙ and "1st tone (no mark)"

#### Scenario: Clear optional slot
- **WHEN** a player selects "clear" for an optional slot (initial, medial, or tone)
- **THEN** the system SHALL set that slot to null and display it as empty

---

### Requirement: Player enters the Chinese character in the character cell
The system SHALL provide a text input in the character cell of each row. The input SHALL accept exactly one Chinese character per row.

#### Scenario: Valid character entry
- **WHEN** a player types a single Chinese character into a character cell
- **THEN** the system SHALL store it as the character for that row

#### Scenario: Multiple characters rejected
- **WHEN** a player types more than one character into a character cell
- **THEN** the system SHALL retain only the first character entered

---

### Requirement: Submission requires all character cells and all final slots to be filled
The system SHALL validate the word input before allowing submission. Every row MUST have a non-empty character cell and a non-empty final slot. Initial, medial, and tone slots are optional.

#### Scenario: Incomplete submission blocked
- **WHEN** a player attempts to submit with one or more empty character cells or empty final slots
- **THEN** the system SHALL display a validation error identifying the incomplete rows and SHALL NOT submit

#### Scenario: Complete submission accepted
- **WHEN** all character cells and final slots are filled
- **THEN** the system SHALL allow submission and send the word data to the server
