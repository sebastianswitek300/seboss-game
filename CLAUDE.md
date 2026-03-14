# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Olczin Game" — a multiplayer trivia/quiz party game in Polish. Players join a lobby, the host starts the game, and everyone answers shuffled questions across three round types: ordering, logo recognition, and audio/music identification. Built with Colyseus (real-time multiplayer framework) on the server and vanilla JS on the client.

## Commands

- **Dev server:** `npm run dev` (nodemon + ts-node, auto-reloads on `src/` changes)
- **Start:** `npm start` (ts-node, no auto-reload)
- **Build:** `npm run build` (TypeScript → `build/`)
- **Production:** `npm run prod` (runs compiled JS from `build/`)
- **No tests** — Playwright was removed; test scripts are stubs.

Server runs on `http://127.0.0.1:2567` by default (configurable via `PORT`/`HOST` env vars).

## Architecture

### Server (TypeScript, `src/`)
- `src/server.ts` — Express + Colyseus server setup. Serves static files from `public/`, `img/`, `music/`, `ui-sound/`.
- `src/rooms/GameRoom.ts` — All game logic lives here: question banks (order, logo, audio), round configuration, scoring, message handlers (`join`, `startGame`, `submitAnswers`, `audioControl`). Questions are shuffled into a flat sequence at game start.
- `src/rooms/schema/GameState.ts` — Colyseus schema definitions (`GameState`, `Player`, `Question`) using `@colyseus/schema` decorators. State is automatically synced to all clients.

### Client (vanilla JS, `public/`)
- `public/index.html` — Single-page app with all CSS inlined. Four screens: login, lobby, game, results. Uses SortableJS for drag-and-drop ordering questions.
- `public/game.js` — Client-side game logic. Connects via Colyseus.js WebSocket, listens to state changes, renders questions, handles submissions.
- `public/colyseus.js` — Bundled Colyseus client library.

### Static Assets
- `img/` — Logo images for logo-recognition questions
- `music/` — MP3 snippets for audio questions
- `ui-sound/` — UI feedback sounds (tap confirmation)

## Key Patterns

- **Host system:** The player with nickname "Seba" automatically becomes host. Host controls game start and audio playback. If host leaves, first remaining player becomes host.
- **Question types:** `order` (arrange 4 items — 1 point per correct position, max 4), `logo` (match image to name — 1 point), `audio` (identify song — 1 point). All mixed and shuffled.
- **Submission flow:** Server waits for all players to submit before revealing correct answers and advancing (5s delay between questions).
- **State sync:** Colyseus schema handles real-time state replication. Client uses `room.onStateChange` for UI updates and `room.onMessage` for events.
- **UI language:** All user-facing text is in Polish.
