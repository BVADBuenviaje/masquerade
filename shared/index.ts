export interface Player {
  id: string;
  isHost: boolean;
  role?: string;
}

export interface Room {
  id: string;
  players: Player[];
  state: 'Lobby' | 'Starting' | 'Playing' | 'Discussion';
  word?: string;
}
