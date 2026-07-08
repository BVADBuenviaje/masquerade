import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Room } from '@masquerade/shared';

const URL = 'http://localhost:3001';
export const socket: Socket = io(URL);

interface GameState {
  room: Room | null;
  playerId: string | null;
  error: string | null;
  setRoom: (room: Room) => void;
  setError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set) => {
  socket.on('connect', () => {
    set({ playerId: socket.id });
  });

  socket.on('room_updated', (room: Room) => {
    set({ room, error: null });
  });

  socket.on('error', (error: string) => {
    set({ error });
  });

  return {
    room: null,
    playerId: null,
    error: null,
    setRoom: (room) => set({ room }),
    setError: (error) => set({ error }),
  };
});
