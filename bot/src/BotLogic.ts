import { Socket } from 'socket.io-client';
import { Room } from '@masquerade/shared';
import { LLMClient } from './LLMClient';

export class BotLogic {
  private socket: Socket;
  private currentRoom: Room | null = null;
  private actionInProgress = false;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  public updateRoom(room: Room) {
    this.currentRoom = room;
    this.evaluateState();
  }

  private async evaluateState() {
    if (!this.currentRoom || this.actionInProgress) return;

    const room = this.currentRoom;
    const botPlayer = room.players.find(p => p.id === this.socket.id);
    if (!botPlayer) return;

    // TurnBased Phase
    if (room.state === 'TurnBased' && room.activePlayerId === this.socket.id && !room.isPaused) {
      this.actionInProgress = true;
      const historyStrings = room.wordHistory.map(entry => entry.word);
      
      const delay = Math.floor(Math.random() * 2000) + 1000; // 1000ms - 3000ms
      setTimeout(async () => {
        try {
          const activeRoom = this.currentRoom;
          if (!activeRoom) return;
          // Ensure we are still the active player before submitting
          if (activeRoom.activePlayerId === this.socket.id && activeRoom.state === 'TurnBased') {
             const clue = await LLMClient.generateClue(botPlayer.role || 'Innocent', activeRoom.word || '', historyStrings);
             this.socket.emit('submit_clue', { roomCode: activeRoom.id, clue });
          }
        } catch (err) {
          console.error("Failed to generate clue", err);
        } finally {
          this.actionInProgress = false;
        }
      }, delay);
    }

    // Voting Phase
    if (room.state === 'Voting' && !botPlayer.vote && !botPlayer.eliminated && !room.isPaused) {
      this.actionInProgress = true;
      
      const delay = Math.floor(Math.random() * 2000) + 1000; // 1000ms - 3000ms
      setTimeout(async () => {
        try {
          const activeRoom = this.currentRoom;
          if (!activeRoom) return;
          if (activeRoom.state === 'Voting') {
             const otherPlayers = activeRoom.players.filter(p => p.id !== this.socket.id && !p.eliminated);
             if (otherPlayers.length > 0) {
               const voteId = await LLMClient.generateVote(botPlayer.role || 'Innocent', otherPlayers, activeRoom.wordHistory);
               this.socket.emit('submit_vote', { roomCode: activeRoom.id, targetPlayerId: voteId });
             }
          }
        } catch (err) {
          console.error("Failed to generate vote", err);
        } finally {
          this.actionInProgress = false;
        }
      }, delay);
    }
  }
}
