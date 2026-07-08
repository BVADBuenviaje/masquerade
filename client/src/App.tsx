import { useState } from 'react';
import { useGameStore, socket } from './store';

function App() {
  const { room, playerId, error } = useGameStore();
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleCreateRoom = () => {
    socket.emit('create_room');
  };

  const handleJoinRoom = () => {
    if (roomCodeInput.trim()) {
      socket.emit('join_room', roomCodeInput.toUpperCase());
    }
  };

  const handleStartGame = () => {
    if (room) {
      socket.emit('start_game', room.id);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl font-bold mb-10 tracking-widest">MASQUERADE</h1>
        {error && <p className="text-red-500 mb-4 bg-red-900/50 p-2 rounded">{error}</p>}
        <div className="space-y-4 flex flex-col w-72">
          <button onClick={handleCreateRoom} className="bg-indigo-600 hover:bg-indigo-700 py-3 rounded font-semibold transition-colors">
            Create Room
          </button>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={roomCodeInput} 
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="Room Code" 
              maxLength={6}
              className="text-black p-3 rounded w-full uppercase text-center font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleJoinRoom} className="bg-emerald-600 hover:bg-emerald-700 px-6 rounded font-semibold transition-colors">
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-bold tracking-widest">ROOM: <span className="text-indigo-400">{room.id}</span></h2>
          <span className="bg-slate-800 px-4 py-1 rounded-full text-sm font-semibold">{room.state}</span>
        </div>
        
        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-4 text-slate-300">Players ({room.players.length})</h3>
          <ul className="space-y-2">
            {room.players.map(p => (
              <li key={p.id} className={`flex items-center p-2 rounded ${p.id === playerId ? 'bg-indigo-900/50 border border-indigo-700' : 'bg-slate-700/50'}`}>
                {p.isHost && <span className="mr-2" title="Host">👑</span>}
                <span className="font-mono">{p.id === playerId ? 'You' : p.id.substring(0, 6)}</span>
                {p.role !== 'Unassigned' && <span className="ml-auto text-sm font-bold text-emerald-400">{p.role}</span>}
              </li>
            ))}
          </ul>
        </div>

        {currentPlayer?.isHost && room.state === 'Lobby' && (
          <button onClick={handleStartGame} className="bg-indigo-600 hover:bg-indigo-700 py-3 w-full rounded font-bold transition-colors">
            Start Game
          </button>
        )}

        {room.state === 'Discussion' && (
          <div className="bg-emerald-900/30 border border-emerald-700 p-6 rounded-lg text-center mt-4">
            <h3 className="text-slate-300 mb-2">Secret Word</h3>
            <p className="text-4xl font-bold tracking-wider text-emerald-400">
              {currentPlayer?.role === 'Impostor' ? '???' : room.word}
            </p>
            {currentPlayer?.role === 'Impostor' && (
              <p className="text-red-400 mt-4 font-bold">You are the Impostor. Blend in.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
