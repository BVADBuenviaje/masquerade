import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { Room, Player } from '@masquerade/shared';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket: Socket) => {
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    const newPlayer: Player = { id: socket.id, isHost: true };
    
    rooms.set(roomCode, {
      id: roomCode,
      players: [newPlayer],
      state: 'Lobby'
    });

    socket.join(roomCode);
    socket.emit('room_created', roomCode);
    io.to(roomCode).emit('room_updated', rooms.get(roomCode));
  });

  socket.on('join_room', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room) {
      const newPlayer: Player = { id: socket.id, isHost: false };
      room.players.push(newPlayer);
      socket.join(roomCode);
      io.to(roomCode).emit('room_updated', room);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

const WORDS = ['APPLE', 'BANANA', 'CARROT', 'DOG', 'EAGLE', 'FALCON', 'GUITAR', 'HAMSTER'];

  socket.on('start_game', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        room.state = 'Starting';
        io.to(roomCode).emit('game_starting');
        io.to(roomCode).emit('room_updated', room);

        setTimeout(() => {
          let currentWords = WORDS;
          try {
            const wordsFilePath = path.join(__dirname, 'words.txt');
            const fileContent = fs.readFileSync(wordsFilePath, 'utf-8');
            const parsedWords = fileContent.split('\n').map(w => w.trim()).filter(w => w.length > 0 && !w.startsWith('#'));
            if (parsedWords.length > 0) {
              currentWords = parsedWords;
            }
          } catch (e) {
            console.error('Failed to read words.txt, using fallback words.', e);
          }
          const secretWord = currentWords[Math.floor(Math.random() * currentWords.length)];
          const impostorIndex = Math.floor(Math.random() * room.players.length);
          
          room.players.forEach((p, i) => {
            p.role = i === impostorIndex ? 'Impostor' : 'Innocent';
          });
          
          room.word = secretWord;
          room.state = 'Discussion';
          io.to(roomCode).emit('room_updated', room);
        }, 3000);
      }
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomCode) => {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(roomCode);
      } else {
        io.to(roomCode).emit('room_updated', room);
      }
    });
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
