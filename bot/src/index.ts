import 'dotenv/config';
import { io } from 'socket.io-client';
import { Room } from '@masquerade/shared';
import { BotLogic } from './BotLogic';

const roomCode = process.argv[2];
if (!roomCode) {
  console.error("Usage: npm start -- <ROOM_CODE>");
  process.exit(1);
}

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
console.log(`Connecting to server at ${SERVER_URL}...`);

const socket = io(SERVER_URL);
const botLogic = new BotLogic(socket);

socket.on('connect', () => {
  console.log(`Connected with socket ID: ${socket.id}`);
  
  // Join the room
  socket.emit('join_room', roomCode, 'Bot-Pending');
  
  // Update name to Automaton-XXXX
  const botNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  const botName = `Automaton-${botNumber}`;
  
  // Wait a small tick to ensure join_room is processed before updating name
  setTimeout(() => {
    socket.emit('update_name', roomCode, botName);
    console.log(`Bot initialized in room ${roomCode} as ${botName}`);
  }, 500);
});

socket.on('room_updated', (room: Room) => {
  botLogic.updateRoom(room);
});

socket.on('disconnect', () => {
  console.log("Disconnected from server.");
});
