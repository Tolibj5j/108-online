# 108 ONLINE

Real-time multiplayer web version of the traditional **108** card game (36-card deck, 6 → Ace). Friends create a private room, share the link, and play from their own phones or computers. Every move is validated by the server.

- 2–6 human players, private rooms with 6-character codes and invite links (`/?room=AB7KQ2`)
- One or two decks (36 / 72 cards), unique id per physical card
- Server-authoritative rules engine; clients receive only their own cards
- Reconnection by session token (refresh, network drop, browser reopen)
- Uzbek interface, felt-table design, Framer Motion animations, responsive layout

## Rules implemented

| Card | Effect |
|---|---|
| 6 | Next player draws 1. Can be answered with another 6; the penalty grows by 1 each time (+1, +2, +3 …). |
| 7 | Next player draws 2. Can be answered with another 7; +2 each time (+2, +4, +6 …). |
| K♠ | Next player draws 5 immediately and loses the turn. Cannot be stacked or passed on. |
| A | Next player is skipped. With two players the turn comes back to the Ace player. |
| Q | **Mode A (default):** any card may follow. **Mode B:** the Queen's player chooses the suit to follow. |
| J, 8, 9, 10, other kings | Normal cards. |

Other rules:
- **Matching:** rank or suit by default. The host can switch to *suit only*.
- **Chains:** 6 and 7 chains are separate by default. The host can allow mixing them.
- **Pending penalty:** you must answer with a chain card or draw the whole penalty. You can't pass.
- **No penalty pending:** you may draw one card per turn. If you still can't play, the turn passes automatically. If the drawn card fits, you may play or pass.
- **Winning card:** emptying your hand wins at once. The last card's effect is not applied, and the starting discard card's effect is not applied either.
- **Empty draw pile:** the discards (except the top card) are reshuffled into a new draw pile. If nobody can play or draw for a full round, the player with the fewest cards wins.

The engine is in `server/src/game/engine.ts`. Card legality is in `shared/rules/play.ts`, which both server and client use.

## Project structure

```
108-online/
├── client/                 React + Vite + Tailwind v4 + Framer Motion
│   └── src/
│       ├── components/     cards, avatars, UI kit, table/ (hand, seats, piles, flyers)
│       ├── pages/          MainMenu, CreateRoom, JoinRoom, Lobby, GamePage, GameOver, Rules, Settings
│       ├── hooks/ store/ socket/ i18n/ utils/ styles/
├── server/                 Express + Socket.IO
│   └── src/
│       ├── index.ts        entry (listens on PORT)
│       ├── app.ts          createAppServer(): static client, /health, Socket.IO
│       ├── game/           engine.ts (rules), view.ts (per-player privacy filter)
│       ├── rooms/          RoomManager (rooms, host, ready, timers, dedup)
│       ├── sessions/       token generation
│       ├── socket/         event handlers + validation + rate limit
│       └── utils/
├── shared/                 types, constants, rules (imported by both sides)
├── tests/                  engine/rules/deck/rooms unit tests + Socket.IO integration tests
├── .kiro/specs/108-online/ requirements.md, design.md, tasks.md
├── render.yaml             Render blueprint
└── .env.example
```

## Requirements

Node.js **20.19+** (22 recommended) and npm 10+.

## Install

```bash
cd 108-online
npm install
```

## Development

```bash
npm run dev
```

- Server: http://localhost:3001 (Socket.IO + `/health`)
- Client: http://localhost:5173 (Vite; proxies `/socket.io` to the server)

Open http://localhost:5173 in two browser windows (or on a phone on the same Wi-Fi: `http://<your-LAN-IP>:5173`). Each tab is its own player because the session is kept per tab.

## Tests

```bash
npm test               # server/engine unit + Socket.IO integration tests, then client tests
npm run test:server    # vitest run (tests/)
npm run test:client    # vitest run in client/ (jsdom + React Testing Library)
npm run typecheck
```

## Production build

```bash
npm run build          # client → client/dist, server → server/dist/index.js (esbuild bundle)
npm start              # node server/dist/index.js — serves the client and Socket.IO on $PORT
```

Then open http://localhost:3001.

## Deploy to Render (single web service)

**Option A — Blueprint**
1. Push the `108-online` folder to a GitHub/GitLab repository. It should be the repository root, or set *Root Directory* in Render.
2. In Render choose **New → Blueprint**, pick the repository. Render reads `render.yaml`.
3. Deploy. The health check is `/health`.

**Option B — manual Web Service**
| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Instances | **1** |
| Env | `NODE_VERSION=22` (optional `NODE_ENV=production`) |

Notes:
- Render provides `PORT`, and the server binds `0.0.0.0:$PORT`.
- The client connects to the same origin it was loaded from, so nothing is hard-coded and no CORS setup is needed. WebSockets work on Render web services (Socket.IO falls back to long-polling if needed).
- `--include=dev` is needed because the build tools (Vite, esbuild, TypeScript) are dev dependencies and Render may set `NODE_ENV=production`.
- Invite links use the page origin, e.g. `https://your-app.onrender.com/?room=AB7KQ2`.

### Environment variables

See `.env.example`. All are optional.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP port (Render sets it) |
| `HOST` | `0.0.0.0` | Bind address |
| `CORS_ORIGINS` | empty | Comma-separated origins, only if the client is hosted elsewhere |
| `RECONNECT_GRACE_MS` | `120000` | How long a disconnected player keeps their seat |
| `DISCONNECTED_TURN_MS` | `20000` | Delay before an offline player's turn is auto-resolved (draw/penalty, then pass; never plays a card) |
| `ROOM_IDLE_TTL_MS` | `7200000` | Idle rooms are deleted after this |
| `CLIENT_DIST` | `client/dist` | Path to built client |
| `VITE_SERVER_URL` | empty | Build-time: point the client at a different server origin |

## Security model

- Clients send intents only (`game:play-card { cardId }`, `game:draw`, `game:pass`). The server checks identity (socket ↔ session binding), room membership, turn, card ownership, legality, penalties and effects.
- `server/src/game/view.ts` builds a separate payload for each player from scratch. Opponents appear only as card counts, and draw-pile contents are never sent. Tests check this.
- Session tokens are 256-bit random values. They are sent only to their owner and never broadcast.
- Payloads are shape-checked, names are sanitised, events are rate-limited per socket, and the Socket.IO message size is capped at 16 KB.
- Duplicate actions with the same `actionId` are ignored. Handlers run one at a time on Node's event loop, so of two simultaneous moves only the one from the player whose turn it is succeeds.

## Limitations

- **Rooms live in memory.** A server restart or redeploy (and Render free-tier sleep after inactivity) deletes every room and match. Players must create a new room. No database persistence is implemented.
- **Single instance only.** Running more than one instance would split rooms between processes. Scaling out would need a shared store (e.g. Redis) and the Socket.IO Redis adapter with sticky sessions.
- Render's free tier sleeps when idle; the first request after sleeping takes a while.
- The exact traditional variants of matching and the Queen are not confirmed, so both are room settings (defaults: rank-or-suit, Queen mode A).
- There is no turn timer for *connected* players. Only offline players are auto-resolved.
- Fonts (Cinzel, Inter) load from Google Fonts. Without them the UI falls back to system serif/sans fonts.
