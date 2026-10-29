# 108 ONLINE — Tasks

- [x] 1. Monorepo scaffold (npm workspaces `client`, `server`; `shared/`; root scripts) — R7.1
- [x] 2. Shared types, constants, socket protocol types — R1, R4
- [x] 3. Deck generation + crypto shuffle — R1.1–R1.4
- [x] 4. `canPlayCard` rules shared by client and server — R2.1–R2.11
- [x] 5. Game engine: deal, play, draw, pass, penalties, K♠, Ace, Queen A/B, reshuffle, win, stalemate, removal, auto-resolve — R2, R5.4, R5.5
- [x] 6. Privacy view builder — R4.2, R4.3
- [x] 7. RoomManager: create/join/leave/ready/settings/start/restart/lobby, host transfer, dedup, timers, sessions — R3, R4.4, R5
- [x] 8. Socket handlers with payload validation and rate limiting — R4.1, R4.5
- [x] 9. Express app serving `client/dist`, `/health`, `PORT` — R7.1, R7.2
- [x] 10. Client store, socket wrapper, session resume, `?room=` handling — R3.3, R5.1, R5.2
- [x] 11. Screens: menu, create, join, lobby, rules, settings — R6.1, R6.2
- [x] 12. Card table: seats, piles, hand, actions, suit picker, invalid-move messages — R6.3, R6.4
- [x] 13. Animations: deal, draw, play, select, effect banners, winner confetti — R6.5
- [x] 14. Unit tests (deck, shuffle, rules, engine, conservation, rooms, view privacy, socket handlers over a fake transport)
- [x] 15. Socket.IO integration tests (create, join, start, legal/illegal/out-of-turn, draw, reconnect, privacy)
- [x] 16. Client tests (PlayingCard, Hand, event text)

## Verification status

Written in a sandbox without npm registry access, so dependencies could not be installed there.
- Ran and passing (70 tests, via Node's built-in runner): `deck`, `rules`, `engine`, `rooms`, `handlers`, client `eventText`.
- Type-checked with `tsc` 5.9: shared, engine, rooms, view (with real types); client and server entry (with stub typings for third-party packages).
- Not yet run: `tests/integration/socket.test.ts` (needs `socket.io`), client component tests (need jsdom/RTL), `vite build`.
  First step after `npm install`: `npm test && npm run typecheck && npm run build`.
- [x] 17. Render blueprint, `.env.example`, README with deployment guide and limitations — R7
