# CocoLoco V2 — Live Studio Transport

## Scope

This branch is a transport-only V2. The game rules, admin behavior, overlay components, assets, sounds, animations, gifts, abilities, scoring and Win Limpia logic are copied from the existing project and are not intentionally redesigned.

The V2 change is the browser-to-browser/window transport used by the overlay:

- Legacy V1 cross-window transport: BroadcastChannel/localStorage plus the legacy localhost WebSocket path.
- V2 cross-window transport: HTTP POST into a server-owned event gateway + Server-Sent Events (SSE) back to every connected browser page.

## Live Studio source

The V2 production server serves the exact same built React application and exposes it from one origin. TikTok LIVE Studio should load the V2 overlay route from that server as a Link/Web source.

The important property is that the overlay does not depend on BroadcastChannel, a second browser window, or a `ws://localhost` connection to receive game state.

## Endpoints

- `GET /api/live/events` — SSE stream consumed by the panel and overlay.
- `POST /api/live/events` — event ingress used by the existing event bus; this is not a new game API.
- `GET /api/live/health` — transport health check.
- `/` and all normal React routes — static production build from `dist/`.

Default V2 port: `8081` (override with `V2_PORT`).

## Run

```text
npm run v2:live
```

This builds the existing frontend and then starts the V2 static/SSE server.

The legacy `bridge/server.js` remains untouched on `main` and is not replaced by this branch. That protects the proven TikTok/TikFinity input and game behavior while V2 isolates the Live Studio presentation transport.

## Acceptance rule

A V2 change is not accepted if any game behavior differs from V1. The acceptance target is:

> V1 behavior + V2 SSE transport.

The overlay must remain visually and behaviorally identical, including scoring, Win Limpia, animations, sounds, gifts, abilities, timer, rounds and session state.
