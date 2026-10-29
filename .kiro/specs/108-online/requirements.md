# 108 ONLINE — Requirements

Format: EARS-style statements. Each requirement has an ID that tests and tasks reference.

## R1. Deck

- **R1.1** The system SHALL build one deck as 36 cards: suits ♠ ♥ ♦ ♣ × ranks 6, 7, 8, 9, 10, J, Q, K, A.
- **R1.2** WHEN the host selects two decks, the system SHALL build 72 cards.
- **R1.3** Every card SHALL have a unique `id`; identical rank/suit cards from different decks SHALL differ by `deckIndex` and `id`.
- **R1.4** The shuffle SHALL be Fisher–Yates driven by `crypto.getRandomValues` with rejection sampling (no modulo bias).

## R2. Rules

- **R2.1 (Six)** WHEN a 6 is played, the pending penalty SHALL increase by 1 and the next player SHALL either play a 6 or draw the full pending amount.
- **R2.2 (Seven)** WHEN a 7 is played, the pending penalty SHALL increase by 2 and the next player SHALL either play a 7 or draw the full pending amount.
- **R2.3** By default a 6 SHALL NOT continue a 7 chain and vice versa. A room setting (`mixPenaltyChains`) MAY allow mixing.
- **R2.4** WHILE a penalty is pending, the player SHALL NOT play any card other than a valid chain card and SHALL NOT pass.
- **R2.5** WHEN a player draws a pending penalty, the penalty SHALL reset to 0 and that player's turn SHALL end.
- **R2.6 (K♠)** WHEN the King of Spades is played, the next player SHALL immediately draw 5 cards and lose the turn. This penalty SHALL NOT stack and SHALL NOT be transferable.
- **R2.7 (Ace)** WHEN an Ace is played, the next player SHALL be skipped. In a 2-player game the turn SHALL return to the Ace player.
- **R2.8 (Queen, mode A — default)** WHEN a Queen is on top of the discard pile and `queenRule = free-next`, any card SHALL be playable.
- **R2.9 (Queen, mode B)** WHEN `queenRule = choose-suit`, playing a Queen SHALL require a chosen suit; the next card SHALL match that suit (or be a Queen).
- **R2.10** Jack and all Kings except K♠, and 8, 9, 10 SHALL be normal cards.
- **R2.11 (Matching)** With `matchRule = rank-or-suit` (default) a card SHALL be playable when rank or suit matches the top card. With `suit-only` only the suit SHALL count.
- **R2.12 (Draw)** WHEN no penalty is pending, a player MAY draw one card once per turn. IF after drawing the player has no playable card, THEN the turn SHALL pass automatically; otherwise the player MAY play or pass.
- **R2.13 (Win)** WHEN a player's hand becomes empty, that player SHALL win immediately; the effect of that final card SHALL NOT be applied.
- **R2.14** The starting discard card's effect SHALL NOT be applied.
- **R2.15 (Empty pile)** WHEN the draw pile is empty, all discard cards except the top SHALL be reshuffled into the draw pile. IF no cards remain, THEN the draw SHALL yield fewer cards.
- **R2.16 (Stalemate)** IF every player in a row ends their turn without playing and without being able to draw, THEN the game SHALL end and the player with the fewest cards SHALL win.
- **R2.17 (Conservation)** At every point, cards in hands + draw pile + discard pile SHALL equal 36 × deckCount.

## R3. Rooms

- **R3.1** A user SHALL create a room with: name, max players (2–6), deck count (1–2), hand size (3–10), Queen rule, matching rule, chain mixing.
- **R3.2** The server SHALL generate a unique 6-character code from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- **R3.3** The invite URL SHALL be `<origin>/?room=<CODE>`; opening it SHALL show the join screen with that code.
- **R3.4** The creator SHALL be host. Only the host SHALL change settings, start, restart, or return the room to the lobby.
- **R3.5** Joining SHALL fail for unknown rooms, full rooms, rooms with a match in progress, and duplicate names.
- **R3.6** The game SHALL NOT start with fewer than 2 players, with non-ready guests, or when `players × handSize + 1 > totalCards`.
- **R3.7** WHEN the host leaves or times out, host SHALL pass to the next (preferably connected) player.
- **R3.8** WHEN a room has no players, it SHALL be deleted. Idle rooms SHALL expire after 2 hours.

## R4. Server authority and privacy

- **R4.1** The server SHALL validate identity, room membership, turn, card ownership, legality, penalties, and effects for every action.
- **R4.2** Each client payload SHALL contain only the viewer's own cards; opponents SHALL be represented by card counts only.
- **R4.3** Session tokens SHALL never appear in broadcast payloads.
- **R4.4** Duplicate actions (same `actionId`) SHALL be ignored without changing state.
- **R4.5** Malformed payloads SHALL be rejected with `INVALID_INPUT`; per-socket rate limiting SHALL apply.

## R5. Reconnection

- **R5.1** On create/join the client SHALL receive a random 256-bit session token and store it in `localStorage`.
- **R5.2** WHEN a client reconnects or refreshes with a valid token, the server SHALL restore identity, membership, hand, and state.
- **R5.3** A disconnected player SHALL be kept for 2 minutes (configurable) before removal.
- **R5.4** WHILE it is a disconnected player's turn for more than 20 seconds, the server SHALL auto-resolve the turn (take penalty, or draw then pass).
- **R5.5** WHEN a player is removed mid-game, their cards SHALL return to the draw pile; IF one player remains, THEN that player SHALL win.

## R6. Interface

- **R6.1** Default language SHALL be Uzbek (Latin).
- **R6.2** Screens: Main menu, Create room, Join room, Lobby, Game table, Game over, Rules, Settings.
- **R6.3** The table SHALL show the player's hand at the bottom, opponents around the table with face-down cards, and the draw pile, discard pile, active suit and pending penalty in the center.
- **R6.4** Players SHALL select a card by click and play it with the Play button or by double-click; draw by clicking the deck. Playable cards SHALL be highlighted. Invalid moves SHALL show a message.
- **R6.5** Animations: dealing, drawing, playing, selection, special effects, winner. Animations SHALL be driven from server state.
- **R6.6** The layout SHALL work on phones (≥ 360 px wide) and desktops.

## R7. Deployment

- **R7.1** One Node service SHALL serve the built client and Socket.IO on `process.env.PORT`.
- **R7.2** No hard-coded localhost URLs in production code paths.
- **R7.3** Docs SHALL state that rooms are in memory and lost on restart, and that horizontal scaling is not supported.
