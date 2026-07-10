import 'dotenv/config';
import http from 'http';
import { io } from 'socket.io-client';
import { Room } from '@masquerade/shared';
import { BotLogic } from './BotLogic';

// Dummy HTTP server to satisfy Render's port binding requirement
const port = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Manager is alive and listening for socket events.');
});
server.listen(port, () => {
  console.log(`[Bot Manager] Dummy web server listening on port ${port} to satisfy Render health checks.`);
});

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

console.log(`[Bot Manager] Starting up...`);
console.log(`[Bot Manager] Connecting to server at ${SERVER_URL}...`);

// The Bot Manager establishes its own connection to listen for spawn requests
const managerSocket = io(SERVER_URL);

managerSocket.on('connect', () => {
  console.log(`[Bot Manager] Connected with ID: ${managerSocket.id}`);
  console.log(`[Bot Manager] Listening for bot spawn requests...`);
});

managerSocket.on('spawn_bot', (roomCode: string) => {
  console.log(`[Bot Manager] Received request to spawn bot in room ${roomCode}`);
  spawnBot(roomCode);
});

managerSocket.on('disconnect', () => {
  console.log(`[Bot Manager] Disconnected from server.`);
});

function spawnBot(roomCode: string) {
  // Each bot needs its own socket connection so it appears as a distinct player
  const botSocket = io(SERVER_URL);
  const botLogic = new BotLogic(botSocket);
  
  botSocket.on('connect', () => {
    console.log(`[Bot ${botSocket.id}] Connected, joining room ${roomCode}...`);
    
    // Join the room
    botSocket.emit('join_room', roomCode, 'Bot-Pending');
    
    // Generate a bot name
    const botNumber = Math.floor(1000 + Math.random() * 9000);
    const botName = `Automaton-${botNumber}`;
    
    // Wait a tick to ensure join_room is processed before updating name
    setTimeout(() => {
      botSocket.emit('update_name', { roomCode, name: botName });
      console.log(`[Bot ${botSocket.id}] Initialized in room ${roomCode} as ${botName}`);
    }, 500);
  });
  
  botSocket.on('room_updated', (room: Room) => {
    // Only pass updates for the specific room this bot is in
    if (room.id === roomCode) {
      botLogic.updateRoom(room);
    }
  });

  botSocket.on('disconnect', () => {
    console.log(`[Bot ${botSocket.id}] Disconnected.`);
  });
}

// Keep process alive and handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[Bot Manager] Shutting down...');
  managerSocket.disconnect();
  process.exit(0);
});
