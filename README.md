# Masquerade

Masquerade is a real-time multiplayer social deduction game built as a Progressive Web App (PWA). Players join private rooms using a room code, where one or more players may secretly become impostors. Innocent players all receive the same secret word, while impostors receive no word and must blend in by observing clues, participating in discussion, and avoiding suspicion.

## Features

* **Server-Authoritative Game Logic:** All role assignments, secret words, timers, and game phases are managed securely on the backend to prevent client-side cheating.
* **Real-Time Multiplayer:** Built with Socket.IO for low-latency, bidirectional communication between clients and the server.
* **AI Bots:** Play even when your friends aren't around! The game features AI bots powered by the Google Gemini API that can deduce clues, blend in as the Impostor, and vote autonomously.
* **Monorepo Architecture:** Utilizes npm workspaces to seamlessly share TypeScript interfaces between the frontend, backend, and bot clients.
* **Progressive Web App (PWA):** Designed for responsive, cross-platform play on desktop and mobile browsers.
* **Modern Frontend:** Powered by React, Vite, Tailwind CSS v4, and Zustand for robust state management.

## Tech Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand
* **Backend:** Node.js, TypeScript, Express, Socket.IO
* **AI Bots:** Node.js, TypeScript, Google Generative AI SDK (Gemini 2.5 Flash), Socket.io-client
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
├── client/               # React UI & PWA Configuration
│   ├── package.json      
│   ├── vite.config.ts    
│   └── src/              # React components, Zustand store, styling
└── bot/                  # AI Bot Client
    ├── package.json      
    ├── .env              # (Create this) GEMINI_API_KEY
    └── src/              # Bot logic and LLM Client
```

## Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (v7 or higher for workspace support)
* A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (Optional: Required only if you want to use AI Bots)

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

If you plan on using AI bots, navigate to the `bot` directory and create a `.env` file with your Gemini API key:
```env
GEMINI_API_KEY=your_api_key_here
```

## Running the Application Locally

To play the game locally, you need to start both the backend server and the frontend development environment.

**1. Start the Game Server:**
Open a terminal and navigate to the server directory:
```bash
cd server
npm run dev
```
The server will run on `http://localhost:3001`. *(Note: The server manages spawning the bots in the background when the host requests them).*

**2. Start the Frontend Client:**
Open a second terminal and navigate to the client directory:
```bash
cd client
npm run dev
```
The client will run on `http://localhost:5173`.

## Live Deployment (Without Bots)
Masquerade can easily be deployed to live environments like Vercel and Railway:
1. **Frontend:** Deploy the `client` directory. Make sure to set the `VITE_SERVER_URL` environment variable to point to your live backend URL.
2. **Backend:** Deploy the `server` directory and allow it to run `npm start`.

*Note: The AI Bot spawning feature relies on background local processes and is not currently compatible with serverless functions.*

## Game Phases

* **Lobby:** The host creates a room. Other players join via a 6-character room code. The host can add AI Bots here.
* **Role Assignment:** The server randomly selects a secret word and assigns roles (Innocent or Impostor).
* **Discussion (Turn-Based):** Players take turns submitting a single-word clue under a strict timer.
* **Voting:** Players review the submitted clues and vote to eliminate a suspect.
* **Reveal & End:** The eliminated player is revealed, and win conditions are evaluated.

## Author

Brian Vincent Alfred Buenviaje
