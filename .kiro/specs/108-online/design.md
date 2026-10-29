# 108 ONLINE — Design

## Architecture

```
Browser (React + Vite)                 Node service (Express + Socket.IO)
┌──────────────────────────┐           ┌────────────────────────────────────┐
│ store (useSyncExternal)  │  socket   │ socket/handlers.ts  (validation,   │
│ socket/actions.ts  ──────┼──────────►│   rate limit, identity from socket)│
│ pages/*, components/*    │◄──────────┼─ "state" (personalised ClientState)│
└──────────────────────────┘           │ rooms/RoomManager.ts (rooms, host, │
                                       │   ready, timers, dedup, sessions)  │
            shared/  ◄─── both ───►    │ game/engine.ts  (authoritative     │
  types, constants, rules (deck,       │   rules, mutates EngineState)      │
  shuffle, canPlayCard)                │ game/view.ts    (privacy filter)   │
                                       └────────────────────────────────────┘
```

One process serves `client/dist` and the Socket.IO endpoint on `process.env.PORT`.

## Key decisions

| Decision | Choice | Reason |
|---|---|---|
| State authority | Server holds `EngineState`; clients send intents only | Requirement R4.1 |
| State sync | After each change the server sends every member a full personalised `ClientState` | Small payloads (< 5 KB); no diff/merge bugs; reconnection is the same code path |
| Privacy | `view.ts` builds payloads from scratch; opponents appear as `cardCount` | Hidden cards never leave the server (R4.2) |
| Concurrency | Node's event loop serialises handlers; the engine validates turn first | Simultaneous actions: the second gets `NOT_YOUR_TURN` |
| Duplicates | Optional `actionId` per action, remembered per room | Retries are idempotent (R4.4) |
| Sessions | 256-bit random token per player, held in `localStorage` | Survives refresh and network drops (R5) |
| Shared code | Plain TS under `shared/`, imported by relative path with `.ts` extensions | Works in Vite, esbuild, tsx, Vitest and plain Node with no build step |
| Server build | esbuild bundle → `server/dist/index.js` | Bundles `shared/` without TS path mapping |
| Persistence | In memory | Simple. Rooms are lost on restart; single instance only |

## Engine state machine

`createGame` → `playing` → (`playCard` | `drawCard` | `passTurn` | `removePlayer` | `autoResolveTurn`)* → `finished`.

Turn context:
- `pendingPenalty: { kind: '6' | '7', amount, chainLength } | null`
- `activeSuit` (Queen mode B only)
- `hasDrawnThisTurn`
- `idleTurnStreak` (stalemate detection)

Effects on play (skipped when the card empties the hand):
- 6 / 7: add 1 / 2 to the pending penalty, advance 1.
- K♠: next player draws 5 immediately, advance 2.
- A: emit `skip`, advance 2.
- Q: mode A leaves the top card free; mode B stores `activeSuit`.

Draw pile empty → reshuffle all discards except the top.

## Timers (RoomManager)

- Disconnect grace (default 120 s): player removed afterwards; host passes on.
- Disconnected-turn timer (default 20 s): `autoResolveTurn` draws/takes the penalty, then passes. It never plays a card.
- Idle room sweep: rooms inactive for 2 h are deleted.

## Socket protocol

Client → server (all with ack `{ ok: true, ... } | { ok: false, error }`):
`room:create`, `room:join`, `room:resume`, `room:leave`, `room:update-settings`, `room:set-ready`,
`game:start`, `game:play-card`, `game:draw`, `game:pass`, `game:restart`, `room:return-lobby`.

Server → client: `state` (ClientState), `session:ended` (`replaced` | `removed`).

## Client

- Screens are chosen from the store: no room → menu/create/join/rules/settings; in a room → lobby, table, or table + game-over overlay depending on `room.status`.
- Animations come from server `events` (sequence-numbered). The client keeps the last seen `seq` and plays effects for newer events only, so a refresh does not replay old effects.
- Framer Motion `layoutId` moves your own card from hand to discard; opponents' plays and draws fly between seat and centre positions.
