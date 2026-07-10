export interface Player {
  id: string;
  isHost: boolean;
  role?: string;
  name: string;
  eliminated?: boolean;
  vote?: string;
  isBot?: boolean;
}

export interface RoomSettings {
  turnDuration: number;
  maxRounds: number;
  discussionLength: number;
}

export interface Room {
  id: string;
  players: Player[];
  state: 'Lobby' | 'Starting' | 'Discussion' | 'TurnBased' | 'Voting' | 'End';
  word?: string;
  settings: RoomSettings;
  currentRound: number;
  activePlayerId: string | null;
  wordHistory: { playerId: string; word: string }[];
  isPaused: boolean;
  winner?: 'Innocents' | 'Impostor' | null;
}
