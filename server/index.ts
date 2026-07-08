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

function generateUniqueName(room: Room | { players: Player[] }): string {
  let name = '';
  let isUnique = false;
  while (!isUnique) {
    name = `Player-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    isUnique = !room.players.some(p => p.name === name);
  }
  return name as string;
}

io.on('connection', (socket: Socket) => {
  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    const newPlayer: Player = { id: socket.id, isHost: true, name: generateUniqueName({ players: [] }) };
    
    rooms.set(roomCode, {
      id: roomCode,
      players: [newPlayer],
      state: 'Lobby',
      settings: { turnDuration: 10, maxRounds: 5, discussionLength: 60 },
      currentRound: 1,
      activePlayerId: null,
      wordHistory: [],
      isPaused: false
    });

    socket.join(roomCode);
    socket.emit('room_created', roomCode);
    io.to(roomCode).emit('room_updated', rooms.get(roomCode));
  });

  socket.on('join_room', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room) {
      const newPlayer: Player = { id: socket.id, isHost: false, name: generateUniqueName(room) };
      room.players.push(newPlayer);
      socket.join(roomCode);
      io.to(roomCode).emit('room_updated', room);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('update_settings', ({ roomCode, settings }: { roomCode: string, settings: any }) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.isHost) {
      if (settings.maxRounds && settings.maxRounds >= room.currentRound) {
        room.settings.maxRounds = settings.maxRounds;
      }
      if (settings.turnDuration) room.settings.turnDuration = settings.turnDuration;
      if (settings.discussionLength) room.settings.discussionLength = settings.discussionLength;
      io.to(roomCode).emit('room_updated', room);
    }
  });

  socket.on('pause_game', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.isHost) {
      room.isPaused = true;
      io.to(roomCode).emit('room_updated', room);
    }
  });

  socket.on('resume_game', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.isHost) {
      room.isPaused = false;
      io.to(roomCode).emit('room_updated', room);
    }
  });

  socket.on('start_turn_phase', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.isHost && room.state === 'Discussion') {
      room.state = 'TurnBased';
      room.currentRound = 1;
      room.wordHistory = [];
      const randomIndex = Math.floor(Math.random() * room.players.length);
      room.activePlayerId = room.players[randomIndex].id;
      io.to(roomCode).emit('room_updated', room);
    }
  });

  socket.on('submit_clue', ({ roomCode, clue }: { roomCode: string, clue: string }) => {
    const room = rooms.get(roomCode);
    if (room && room.state === 'TurnBased' && room.activePlayerId === socket.id && !room.isPaused) {
      if (clue && clue.trim()) {
        room.wordHistory.push({ playerId: socket.id, word: clue.trim().substring(0, 30) });
        
        const currentIndex = room.players.findIndex(p => p.id === socket.id);
        const nextIndex = (currentIndex + 1) % room.players.length;
        
        if (room.wordHistory.length % room.players.length === 0) {
          room.currentRound += 1;
        }
        
        if (room.currentRound > room.settings.maxRounds) {
          room.state = 'Voting';
          room.activePlayerId = null;
          room.players.forEach(p => p.vote = undefined);
        } else {
          room.activePlayerId = room.players[nextIndex].id;
        }
        
        io.to(roomCode).emit('room_updated', room);
      }
    }
  });

  socket.on('update_name', ({ roomCode, name }: { roomCode: string, name: string }) => {
    const room = rooms.get(roomCode);
    if (room && name && typeof name === 'string') {
      const trimmedName = name.trim().substring(0, 16);
      if (room.players.some(p => p.name === trimmedName && p.id !== socket.id)) {
        socket.emit('error', 'Name is already taken');
        return;
      }
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.name = trimmedName;
        io.to(roomCode).emit('room_updated', room);
      }
    }
  });

const WORDS = ['APPLE', 'BANANA', 'CARROT', 'DOG', 'EAGLE', 'FALCON', 'GUITAR', 'HAMSTER'];

  function assignRolesAndWord(roomCode: string, room: Room) {
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
      p.eliminated = false;
      p.vote = undefined;
    });
    
    room.word = secretWord;
    room.state = 'Discussion';
    room.winner = null;
    io.to(roomCode).emit('room_updated', room);
  }

  socket.on('start_game', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        room.state = 'Starting';
        io.to(roomCode).emit('game_starting');
        io.to(roomCode).emit('room_updated', room);

        setTimeout(() => {
          assignRolesAndWord(roomCode, room);
        }, 3000);
      }
    }
  });

  socket.on('start_voting', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.isHost) {
      room.state = 'Voting';
      room.players.forEach(p => p.vote = undefined);
      io.to(roomCode).emit('room_updated', room);
    }
  });

  socket.on('submit_vote', ({ roomCode, targetPlayerId }: { roomCode: string, targetPlayerId: string }) => {
    const room = rooms.get(roomCode);
    if (room && room.state === 'Voting') {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.vote) {
        player.vote = targetPlayerId;
        
        // Check if everyone has voted
        if (room.players.every(p => p.vote)) {
          // Tally votes
          const voteCounts: Record<string, number> = {};
          room.players.forEach(p => {
            if (p.vote) {
              voteCounts[p.vote] = (voteCounts[p.vote] || 0) + 1;
            }
          });
          
          let maxVotes = 0;
          for (const count of Object.values(voteCounts)) {
            if (count > maxVotes) maxVotes = count;
          }
          
          // Check for exact 1 vote tie
          if (maxVotes === 1 && room.players.length > 1) {
            // No one eliminated
          } else {
            // Find all players with maxVotes
            const tiedPlayers = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
            if (tiedPlayers.length === room.players.length) {
              // Everyone tied? No one is eliminated.
            } else {
              // Eliminate tied players
              tiedPlayers.forEach(id => {
                const p = room.players.find(pl => pl.id === id);
                if (p) p.eliminated = true;
              });
            }
          }
          
          // Evaluate win condition
          const impostor = room.players.find(p => p.role === 'Impostor');
          if (impostor?.eliminated) {
            room.winner = 'Innocents';
          } else {
            room.winner = 'Impostor';
          }
          
          room.state = 'End';
        }
        
        io.to(roomCode).emit('room_updated', room);
      }
    }
  });

  socket.on('play_again', (roomCode: string) => {
    const room = rooms.get(roomCode);
    if (room && room.players.find(p => p.id === socket.id)?.isHost) {
      room.currentRound = 1;
      room.wordHistory = [];
      assignRolesAndWord(roomCode, room);
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
