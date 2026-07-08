# Masquerade

Masquerade is a real-time multiplayer social deduction game built as a Progressive Web App (PWA). Players join private rooms using a room code, where one or more players may secretly become impostors. Innocent players all receive the same secret word, while impostors receive no word and must blend in by observing clues, participating in discussion, and avoiding suspicion.

## Features

* **Server-Authoritative Game Logic:** All role assignments, secret words, timers, and game phases are managed securely on the backend to prevent client-side cheating.
* **Real-Time Multiplayer:** Built with Socket.IO for low-latency, bidirectional communication between clients and the server.
* **Monorepo Architecture:** Utilizes npm workspaces to seamlessly share TypeScript interfaces between the frontend and backend.
* **Progressive Web App (PWA):** Designed for responsive, cross-platform play on desktop and mobile browsers.
* **Modern Frontend:** Powered by React, Vite, Tailwind CSS v4, and Zustand for robust state management.

## Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand
* **Backend:** Node.js, TypeScript, Express, Socket.IO
* **Shared:** TypeScript interfaces and game state enumerations
* **Tooling:** npm workspaces

## Project Structure

```text
masquerade/
├── package.json          # Root workspace config
├── shared/               # @masquerade/shared
│   ├── package.json      
│   └── index.ts          # Shared types: Player, Room, Role, GamePhase
├── server/               # WebSocket API & Game Engine
│   ├── package.json      
│   ├── tsconfig.json     
│   └── index.ts          # Express & Socket.io logic
└── client/               # React PWA & UI
    ├── package.json      
    ├── vite.config.ts    
    └── src/              # React components, Zustand store, styling
```

## Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (v7 or higher for workspace support)

### Installation

Clone the repository:
```bash
git clone https://github.com/yourusername/masquerade.git
cd masquerade
```

Install dependencies across all workspaces:
```bash
npm install
```

## Running the Application locally

To play the game locally, you need to start both the backend server and the frontend development environment.

**Start the Game Server:**
Open a terminal and navigate to the server directory:
```bash
cd server
npm run dev
```
The server will run on `http://localhost:3001`.

**Start the Frontend Client:**
Open a second terminal and navigate to the client directory:
```bash
cd client
npm run dev
```
The client will run on `http://localhost:5173`.

Open `http://localhost:5173` in multiple browser tabs to simulate multiple players joining the same room.

## Game Phases

* **Lobby:** The host creates a room. Other players join via a 6-character room code.
* **Role Assignment:** The server randomly selects a secret word and assigns roles (Innocent or Impostor).
* **Discussion:** Players discuss clues to deduce the word or identify the Impostor.
* **Voting:** Players vote to eliminate a suspect.
* **Reveal & End:** The eliminated player is revealed, and win conditions are evaluated.

## Author

Brian Vincent Alfred Buenviaje
