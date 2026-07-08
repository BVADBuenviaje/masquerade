import { useState, useEffect } from 'react';
import { useGameStore, socket } from './store';
import { Copy, Check, Edit2, Play, Pause } from 'lucide-react';

function App() {
  const { room, playerId, error } = useGameStore();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Game state
  const [clueInput, setClueInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (room?.state === 'TurnBased') {
      setTimeLeft(room.settings?.turnDuration || 10);
    }
  }, [room?.activePlayerId, room?.state, room?.settings?.turnDuration]);

  useEffect(() => {
    if (room?.state !== 'TurnBased' || room?.isPaused) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.state, room?.isPaused]);

  const handleCreateRoom = () => socket.emit('create_room');
  const handleJoinRoom = () => {
    if (roomCodeInput.trim()) socket.emit('join_room', roomCodeInput.toUpperCase());
  };
  const handleStartGame = () => {
    if (room) socket.emit('start_game', room.id);
  };
  const handleCopyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const handleUpdateName = () => {
    if (room && tempName.trim()) {
      socket.emit('update_name', { roomCode: room.id, name: tempName });
    }
    setEditingName(false);
  };

  const handleUpdateSettings = (key: string, value: number) => {
    if (room) {
      socket.emit('update_settings', { roomCode: room.id, settings: { [key]: value } });
    }
  };

  const handleStartTurnPhase = () => {
    if (room) socket.emit('start_turn_phase', room.id);
  };

  const handleSubmitClue = () => {
    if (room && clueInput.trim()) {
      socket.emit('submit_clue', { roomCode: room.id, clue: clueInput });
      setClueInput('');
    }
  };

  const handleSubmitVote = (targetPlayerId: string) => {
    if (room) {
      socket.emit('submit_vote', { roomCode: room.id, targetPlayerId });
    }
  };

  const handlePlayAgain = () => {
    if (room) socket.emit('play_again', room.id);
  };

  const handleTogglePause = () => {
    if (room) {
      if (room.isPaused) socket.emit('resume_game', room.id);
      else socket.emit('pause_game', room.id);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-5xl md:text-7xl font-black mb-10 tracking-widest text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">MASQUERADE</h1>
        {error && <p className="text-red-500 mb-4 bg-red-950/50 border border-red-800 p-2 rounded font-bold uppercase tracking-wider">{error}</p>}
        <div className="space-y-4 flex flex-col w-72">
          <button onClick={handleCreateRoom} className="bg-amber-600 hover:bg-amber-500 py-3 rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_10px_rgba(217,119,6,0.6)]">
            CREATE ROOM
          </button>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={roomCodeInput} 
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="CODE" 
              maxLength={6}
              className="text-amber-400 bg-slate-900 border border-slate-700 p-3 rounded w-full uppercase text-center font-black tracking-widest outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-600"
            />
            <button onClick={handleJoinRoom} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-500 px-6 rounded font-black tracking-widest uppercase transition-colors">
              JOIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 relative">
      {room.isPaused && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <h1 className="text-6xl md:text-8xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)] mb-8 mt-12">PAUSED</h1>
          
          {isHost && (
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] w-full max-w-sm mb-8">
              <h3 className="text-xl font-black mb-4 text-slate-400 tracking-widest uppercase text-center">ADJUST SETTINGS</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Turn Duration (s)</label>
                  <input 
                    type="number" 
                    value={room.settings?.turnDuration || 10} 
                    onChange={e => handleUpdateSettings('turnDuration', parseInt(e.target.value))}
                    className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Rounds (Min {room.currentRound})</label>
                  <input 
                    type="number" 
                    value={room.settings?.maxRounds || 5} 
                    onChange={e => handleUpdateSettings('maxRounds', parseInt(e.target.value))}
                    min={room.currentRound}
                    className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Discussion (s)</label>
                  <input 
                    type="number" 
                    value={room.settings?.discussionLength || 60} 
                    onChange={e => handleUpdateSettings('discussionLength', parseInt(e.target.value))}
                    className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {isHost && (
            <button onClick={handleTogglePause} className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-8 py-4 rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 hover:scale-105 mb-12">
              <Play size={24} fill="currentColor" /> RESUME GAME
            </button>
          )}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-amber-900/50 pb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black tracking-widest">ROOM: <span className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">{room.id}</span></h2>
            <button onClick={handleCopyCode} className="text-slate-400 hover:text-amber-400 transition-colors p-2 bg-slate-900 rounded border border-slate-800 hover:border-amber-500/50">
              {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
            </button>
          </div>
          <div className="flex gap-4 items-center">
            {isHost && (room.state === 'TurnBased' || room.state === 'Voting') && !room.isPaused && (
              <button onClick={handleTogglePause} className="text-amber-500 hover:text-amber-400 bg-slate-900 border border-slate-700 p-2 rounded transition-colors shadow-[0_0_8px_rgba(217,119,6,0.2)]" title="Pause Game">
                <Pause size={20} fill="currentColor" />
              </button>
            )}
            <span className="bg-slate-900 border border-amber-600/30 text-amber-500 px-4 py-1 rounded text-sm font-black tracking-widest uppercase shadow-[0_0_8px_rgba(217,119,6,0.2)]">
              {room.state}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Players & Settings */}
          <div className="space-y-6 md:col-span-1">
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <h3 className="text-xl font-black mb-4 text-slate-400 tracking-widest uppercase">PLAYERS ({room.players.length})</h3>
              <ul className="space-y-3">
                {room.players.map(p => {
                  const isMe = p.id === playerId;
                  const isActive = room.state === 'TurnBased' && room.activePlayerId === p.id;
                  return (
                    <li key={p.id} className={`flex items-center p-3 rounded bg-slate-950 border ${isActive ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : isMe ? 'border-amber-700/50' : 'border-slate-800'}`}>
                      {p.isHost && <span className="mr-3 text-amber-500" title="Host">👑</span>}
                      
                      {isMe && editingName ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUpdateName()}
                            maxLength={16}
                            className="bg-slate-900 text-amber-400 border border-amber-600/50 rounded px-2 py-1 font-bold outline-none focus:border-amber-400 w-full"
                            autoFocus
                          />
                          <button onClick={handleUpdateName} className="text-emerald-500 hover:text-emerald-400 bg-slate-800 p-1 rounded">
                            <Check size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center gap-3 truncate">
                          <span className={`font-bold tracking-wide uppercase truncate ${isMe ? 'text-amber-400' : 'text-slate-300'}`}>
                            {p.name}
                          </span>
                          {isMe && (
                            <button onClick={() => { setTempName(p.name); setEditingName(true); }} className="text-slate-500 hover:text-amber-400 transition-colors shrink-0">
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      )}

                      {p.role !== 'Unassigned' && room.state !== 'TurnBased' && (
                        <span className="ml-2 shrink-0 text-xs font-black tracking-widest uppercase text-amber-500 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                          {p.role}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Settings Panel */}
            {room.state === 'Lobby' && (
              <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <h3 className="text-xl font-black mb-4 text-slate-400 tracking-widest uppercase">SETTINGS</h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Turn Duration (s)</label>
                    <input 
                      type="number" 
                      value={room.settings?.turnDuration || 10} 
                      onChange={e => handleUpdateSettings('turnDuration', parseInt(e.target.value))}
                      disabled={!isHost}
                      className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Rounds</label>
                    <input 
                      type="number" 
                      value={room.settings?.maxRounds || 5} 
                      onChange={e => handleUpdateSettings('maxRounds', parseInt(e.target.value))}
                      disabled={!isHost}
                      className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Discussion (s)</label>
                    <input 
                      type="number" 
                      value={room.settings?.discussionLength || 60} 
                      onChange={e => handleUpdateSettings('discussionLength', parseInt(e.target.value))}
                      disabled={!isHost}
                      className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Game Board */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Lobby Start Button */}
            {isHost && room.state === 'Lobby' && (
              <button onClick={handleStartGame} className="bg-amber-600 hover:bg-amber-500 text-slate-950 py-4 w-full rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)]">
                START MASQUERADE
              </button>
            )}

            {/* Intermediate Reveal (Discussion) */}
            {room.state === 'Discussion' && (
              <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-lg text-center shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
                <h3 className="text-slate-400 mb-4 font-black tracking-widest uppercase text-sm">THE SECRET WORD</h3>
                <p className="text-5xl md:text-6xl font-black tracking-widest text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] mb-8">
                  {currentPlayer?.role === 'Impostor' ? '???' : room.word}
                </p>
                {currentPlayer?.role === 'Impostor' && (
                  <div className="pt-6 border-t border-red-900/30 mb-8">
                    <p className="text-red-500 font-black tracking-widest uppercase text-xl drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                      YOU ARE THE IMPOSTOR. BLEND IN.
                    </p>
                  </div>
                )}
                {isHost && (
                  <button onClick={handleStartTurnPhase} className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-8 py-3 rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                    START ROUND 1
                  </button>
                )}
                {!isHost && (
                  <p className="text-slate-500 font-bold uppercase tracking-widest">Waiting for host to start...</p>
                )}
              </div>
            )}

            {/* TurnBased Game Board */}
            {room.state === 'TurnBased' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col h-full min-h-[400px]">
                <div className="mb-6 p-4 bg-slate-950 border border-amber-500/30 rounded text-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <p className="text-slate-500 text-xs font-black tracking-widest uppercase mb-1">YOUR SECRET WORD</p>
                  <p className="text-2xl font-black tracking-widest text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                    {currentPlayer?.role === 'Impostor' ? '???' : room.word}
                  </p>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-amber-500 tracking-widest uppercase">CLUES</h3>
                  <span className="text-slate-400 font-bold tracking-widest">ROUND {room.currentRound} / {room.settings?.maxRounds}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 mb-6 bg-slate-950 p-4 rounded border border-slate-800">
                  {room.wordHistory?.length === 0 && (
                    <p className="text-slate-500 text-center font-bold tracking-widest uppercase mt-10">No clues submitted yet.</p>
                  )}
                  {room.wordHistory?.map((entry, idx) => {
                    const p = room.players.find(pl => pl.id === entry.playerId);
                    return (
                      <div key={idx} className="flex gap-4 items-baseline border-b border-slate-800/50 pb-2">
                        <span className="text-slate-400 font-bold w-32 truncate">{p?.name || 'Unknown'}:</span>
                        <span className="text-amber-400 font-black tracking-wider uppercase text-lg">{entry.word}</span>
                      </div>
                    );
                  })}
                </div>

                {room.activePlayerId === playerId && !room.isPaused ? (
                  <div className="flex flex-col relative mt-8">
                    <div className="absolute -top-10 right-0 text-amber-500 font-black tracking-widest bg-slate-950 px-4 py-1 rounded border border-slate-800 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                      {timeLeft}s
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clueInput}
                        onChange={e => setClueInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmitClue()}
                        placeholder="ENTER YOUR CLUE..."
                        className="flex-1 bg-slate-950 border border-amber-500/50 p-4 rounded text-amber-400 font-black tracking-widest uppercase outline-none focus:border-amber-400 focus:shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        autoFocus
                      />
                      <button onClick={handleSubmitClue} className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-8 rounded font-black tracking-widest uppercase transition-colors">
                        SUBMIT
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded text-center flex flex-col items-center justify-center">
                    <p className="text-slate-500 font-bold tracking-widest uppercase mb-2">
                      Waiting for <span className="text-amber-500">{room.players.find(p => p.id === room.activePlayerId)?.name || 'Player'}</span>
                    </p>
                    <p className="text-4xl font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] tracking-widest">
                      {timeLeft}s
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Voting Phase */}
            {room.state === 'Voting' && (
              <div className="bg-slate-900 border-2 border-red-900/50 p-8 rounded-lg text-center shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                 <h3 className="text-red-500 mb-4 font-black tracking-widest uppercase text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">VOTING PHASE</h3>
                 <p className="text-slate-400 font-bold tracking-widest uppercase mb-8">Who is the Impostor?</p>
                 
                 {currentPlayer?.vote ? (
                   <p className="text-amber-500 font-black tracking-widest uppercase">Waiting for remaining votes...</p>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {room.players.map(p => (
                       <button 
                         key={p.id}
                         onClick={() => handleSubmitVote(p.id)}
                         className="bg-slate-950 border border-slate-700 hover:border-red-500 p-4 rounded text-slate-300 hover:text-red-500 font-black tracking-widest uppercase transition-colors"
                       >
                         {p.name}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            )}

            {/* End Phase */}
            {room.state === 'End' && (
              <div className="bg-slate-900 border-2 border-amber-500/50 p-8 rounded-lg text-center shadow-[0_0_30px_rgba(245,158,11,0.15)]">
                 <h3 className={`text-5xl font-black tracking-widest uppercase mb-8 ${room.winner === 'Innocents' ? 'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>
                   {room.winner === 'Innocents' ? 'INNOCENTS WIN' : 'IMPOSTOR WINS'}
                 </h3>
                 
                 <div className="space-y-4 mb-8 text-left max-w-sm mx-auto bg-slate-950 p-6 rounded border border-slate-800">
                   <p className="text-slate-400 font-bold tracking-widest uppercase">
                     The Impostor was: <span className="text-red-500">{room.players.find(p => p.role === 'Impostor')?.name}</span>
                   </p>
                   <div>
                     <p className="text-slate-500 font-bold tracking-widest uppercase mb-2">Eliminated Players:</p>
                     <ul className="list-disc list-inside text-slate-300 font-bold">
                       {room.players.filter(p => p.eliminated).map(p => (
                         <li key={p.id}>{p.name}</li>
                       ))}
                       {room.players.filter(p => p.eliminated).length === 0 && (
                         <li className="text-slate-600">No one was eliminated.</li>
                       )}
                     </ul>
                   </div>
                 </div>

                 {isHost && (
                   <button onClick={handlePlayAgain} className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-8 py-4 w-full sm:w-auto rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                     PLAY AGAIN
                   </button>
                 )}
                 {!isHost && (
                   <p className="text-slate-500 font-bold uppercase tracking-widest">Waiting for host to play again...</p>
                 )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
