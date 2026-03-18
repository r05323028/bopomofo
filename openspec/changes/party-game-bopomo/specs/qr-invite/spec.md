## ADDED Requirements

### Requirement: Host screen displays a QR code for the room join link
The system SHALL render a QR code on the host view (`/room/[id]`) that encodes the full URL of the room's join page (`/room/[id]/join`). The QR code SHALL be generated client-side using `react-qr-code` (or equivalent).

#### Scenario: Host view loaded
- **WHEN** the host navigates to `/room/[id]`
- **THEN** the page SHALL display a QR code encoding the absolute URL `{origin}/room/{id}/join`

#### Scenario: Player scans QR code
- **WHEN** a player scans the QR code with their mobile device
- **THEN** their browser SHALL navigate to `/room/[id]/join` where they can enter their name and submit their word

---

### Requirement: Join link is also displayed as plain text
The system SHALL display the join URL as a copyable text string alongside the QR code so players without a QR scanner can navigate manually.

#### Scenario: Host shares link manually
- **WHEN** the host view is displayed
- **THEN** the full join URL SHALL be visible as text that can be selected and copied

---

### Requirement: QR code updates if room ID changes
The QR code SHALL always reflect the current room's join URL. If the component remounts or the room ID changes (e.g., navigation), the QR code SHALL regenerate.

#### Scenario: Component remount
- **WHEN** the host view component remounts with the same room ID
- **THEN** the QR code SHALL render identically to the previous render (same URL encoded)
