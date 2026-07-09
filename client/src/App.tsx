import { useState, useEffect, useRef } from 'react';
import { useGameStore, socket } from './store';
import { Copy, Check, Edit2, Play, Pause, Send, MoreHorizontal } from 'lucide-react';

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
      setTimeLeft(room.settings?.turnDuration || 20);
    }
  }, [room?.activePlayerId, room?.state, room?.settings?.turnDuration]);

  useEffect(() => {
    if (room?.state !== 'TurnBased' || room?.isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) {
          const currentPlayer = room.players.find(p => p.id === playerId);
          if (currentPlayer?.isHost) {
            socket.emit('force_skip', room.id);
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.state, room?.isPaused, room?.id, playerId, room?.players]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (room?.state === 'TurnBased') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.wordHistory]);

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

  const handleBackToLobby = () => {
    if (room) socket.emit('back_to_lobby', room.id);
  };

  const handleTogglePause = () => {
    if (room) {
      if (room.isPaused) socket.emit('resume_game', room.id);
      else socket.emit('pause_game', room.id);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-widest text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" style={{ fontFamily: '"Cinzel", "Montserrat", sans-serif' }}>MASQUERADE</h1>
          <img src="/favicon.png" alt="Masquerade Logo" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        </div>
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

  const playersCard = (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] h-full">
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

              {p.role !== 'Unassigned' && (room.state === 'End' || isMe) && (
                <span className="ml-2 shrink-0 text-xs font-black tracking-widest uppercase text-amber-500 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                  {p.role}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  const settingsCard = (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] h-full">
      <h3 className="text-xl font-black mb-4 text-slate-400 tracking-widest uppercase">SETTINGS</h3>
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Turn Duration (s)</label>
          <input
            type="number"
            value={room.settings?.turnDuration || 20}
            onChange={e => handleUpdateSettings('turnDuration', parseInt(e.target.value))}
            disabled={!isHost}
            className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Rounds (Min {room.currentRound})</label>
          <input
            type="number"
            value={room.settings?.maxRounds || 5}
            onChange={e => handleUpdateSettings('maxRounds', parseInt(e.target.value))}
            min={room.currentRound}
            disabled={!isHost}
            className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Discussion (s)</label>
          <input
            type="number"
            value={room.settings?.discussionLength || 180}
            onChange={e => handleUpdateSettings('discussionLength', parseInt(e.target.value))}
            disabled={!isHost}
            className="bg-slate-950 border border-slate-700 p-2 rounded text-amber-400 font-bold outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );

  const rulesCard = (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] h-full">
      <h3 className="text-xl font-black mb-4 text-slate-400 tracking-widest uppercase">RULES</h3>
      <div className="space-y-4 text-sm text-slate-300 font-bold tracking-wide">
        <p><span className="text-amber-500">1.</span> One player is the Impostor, the rest are innocent.</p>
        <p><span className="text-amber-500">2.</span> Innocent players know the Secret Word. The Impostor doesn't.</p>
        <p><span className="text-amber-500">3.</span> Take turns giving a single-word clue. Prove you know the word without making it too obvious!</p>
        <p><span className="text-amber-500">4.</span> After all rounds, discuss and vote on who the Impostor is.</p>
        <p><span className="text-amber-500">5.</span> The innocent players win if they catch the Impostor. The Impostor wins if they survive or guess the word.</p>
      </div>
    </div>
  );

  return (
    <div className={`text-white relative flex flex-col ${room.state === 'TurnBased' ? 'min-h-[100dvh] p-0' : 'min-h-screen p-4 md:p-8'}`}>
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
                    value={room.settings?.turnDuration || 20}
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
                    value={room.settings?.discussionLength || 180}
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

      {room.state === 'TurnBased' && (
        <div className="flex flex-col h-[100dvh] w-full max-w-3xl mx-auto md:border-x border-slate-800 bg-transparent absolute md:relative inset-0 z-40 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 flex justify-between items-center shadow-md shrink-0">
            <div className="flex-1"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-slate-500 text-[10px] font-black tracking-widest uppercase mb-1">SECRET WORD</span>
              <span className="text-xl font-black tracking-widest text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                {currentPlayer?.role === 'Impostor' ? '???' : room.word}
              </span>
            </div>
            <div className="flex-1 flex justify-end">
              {isHost && (
                <button onClick={handleTogglePause} className="text-slate-400 hover:text-amber-500 transition-colors p-2 rounded-full hover:bg-slate-800">
                  <MoreHorizontal size={24} />
                </button>
              )}
            </div>
          </div>

          {/* Chat Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {room.wordHistory?.length === 0 && (
              <p className="text-slate-500 text-center font-bold tracking-widest uppercase mt-10">Waiting for first clue...</p>
            )}
            {room.wordHistory?.map((entry, idx) => {
              const p = room.players.find(pl => pl.id === entry.playerId);
              const isSelf = p?.id === playerId;
              const isNewRound = idx % room.players.length === 0;
              const roundNum = Math.floor(idx / room.players.length) + 1;

              return (
                <div key={idx} className="w-full flex flex-col gap-4">
                  {isNewRound && (
                    <div className="flex justify-center mt-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-800 px-3 py-1 rounded-full shadow-sm">
                        ROUND {roundNum}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'} w-full`}>
                    <div className={`flex items-end gap-2 max-w-[85%] ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isSelf && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                          <span className="text-slate-400 font-black text-sm">{p?.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <span className={`text-[10px] font-black tracking-widest uppercase mb-1 ${isSelf ? 'text-amber-500' : 'text-slate-500'}`}>
                          {isSelf ? 'ME' : p?.name}
                        </span>
                        <div className={`px-4 py-3 font-black uppercase tracking-widest shadow-md ${isSelf
                            ? 'bg-amber-600 text-slate-950 rounded-2xl rounded-br-sm shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl rounded-bl-sm'
                          }`}>
                          {entry.word}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {room.activePlayerId !== playerId && (
              <div className="flex justify-start w-full mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                    <span className="text-slate-400 font-black text-sm">
                      {room.players.find(p => p.id === room.activePlayerId)?.name.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="bg-slate-800 text-slate-400 px-4 py-2 rounded-2xl rounded-bl-sm border border-slate-700 text-xs font-bold tracking-widest uppercase italic flex gap-1">
                    Typing<span className="animate-pulse">...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 bg-slate-900 border-t border-slate-800 p-3 flex flex-col relative pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="absolute -top-12 right-4 bg-slate-900 text-amber-500 font-black tracking-widest px-4 py-1.5 rounded-full border border-slate-700 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
              {timeLeft}s
            </div>
            {room.activePlayerId === playerId && !room.isPaused ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={clueInput}
                  onChange={e => setClueInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitClue()}
                  placeholder="TYPE YOUR CLUE..."
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-full px-5 py-3 text-amber-400 font-black tracking-widest uppercase outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  autoFocus
                />
                <button
                  onClick={handleSubmitClue}
                  disabled={!clueInput.trim()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${clueInput.trim() ? 'bg-amber-600 text-slate-950 hover:bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                >
                  <Send size={20} className="-ml-0.5 mt-0.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center opacity-50 pointer-events-none">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-5 py-3 text-slate-600 font-bold tracking-widest uppercase text-center">
                  WAITING FOR TURN...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {room.state !== 'TurnBased' && (
        <div className="max-w-4xl mx-auto mt-12 md:mt-24">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b border-amber-900/50 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black tracking-widest">ROOM: <span className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">{room.id}</span></h2>
              <button onClick={handleCopyCode} className="text-slate-400 hover:text-amber-400 transition-colors p-2 bg-slate-900 rounded border border-slate-800 hover:border-amber-500/50">
                {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
              </button>
            </div>
            <div className="flex gap-4 items-center">
              {isHost && room.state === 'Voting' && !room.isPaused && (
                <button onClick={handleTogglePause} className="text-amber-500 hover:text-amber-400 bg-slate-900 border border-slate-700 p-2 rounded transition-colors shadow-[0_0_8px_rgba(217,119,6,0.2)]" title="Pause Game">
                  <Pause size={20} fill="currentColor" />
                </button>
              )}
              <span className="bg-slate-900 border border-amber-600/30 text-amber-500 px-4 py-1 rounded text-sm font-black tracking-widest uppercase shadow-[0_0_8px_rgba(217,119,6,0.2)]">
                {room.state}
              </span>
            </div>
          </div>

          {room.state === 'Lobby' ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Settings Card (Left) */}
                <div className="lg:col-span-4">
                  {settingsCard}
                </div>

                {/* Players Card (Middle) */}
                <div className="lg:col-span-4">
                  {playersCard}
                </div>

                {/* Rules Card (Right) */}
                <div className="lg:col-span-4">
                  {rulesCard}
                </div>
              </div>

              {/* Lobby Start Button (Below) */}
              {isHost && (
                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => socket.emit('add_bot', room.id)}
                    className="py-4 px-8 rounded font-black tracking-widest uppercase transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.4)] whitespace-nowrap"
                  >
                    ADD AI BOT
                  </button>
                  <button
                    onClick={handleStartGame}
                    disabled={room.players.length < 3}
                    className={`flex-1 py-4 rounded font-black tracking-widest uppercase transition-colors ${room.players.length < 3 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)]'}`}
                  >
                    {room.players.length < 3 ? 'WAITING FOR PLAYERS (MIN 3)' : 'START MASQUERADE'}
                  </button>
                </div>
              )}
              {!isHost && (
                <p className="text-slate-500 font-bold uppercase tracking-widest text-center mt-4 bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                  WAITING FOR HOST TO START...
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Left Column: Players */}
              {room.state !== 'Voting' && (
                <div className="space-y-6 md:col-span-1">
                  {playersCard}
                </div>
              )}

              {/* Right Column: Game Board */}
              <div className={`space-y-6 ${room.state === 'Voting' ? 'md:col-span-3' : 'md:col-span-2'}`}>

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

                {/* TurnBased UI Removed - Refactored above */}

                {/* Voting Phase */}
                {room.state === 'Voting' && (
                  <div className="bg-slate-900 border-2 border-red-900/50 p-8 rounded-lg text-center shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                    <h3 className="text-red-500 mb-4 font-black tracking-widest uppercase text-3xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">VOTING PHASE</h3>
                    <p className="text-slate-400 font-bold tracking-widest uppercase mb-8">Who is the Impostor?</p>

                    {currentPlayer?.vote ? (
                      <p className="text-amber-500 font-black tracking-widest uppercase mb-12">Waiting for remaining votes...</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
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

                    {/* Word summary per player */}
                    <div className="mt-8 text-left bg-slate-950 p-6 rounded-lg border border-slate-800">
                      <h4 className="text-slate-500 font-black tracking-widest uppercase mb-6 text-center">SUBMITTED CLUES</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {room.players.map(p => {
                          const words = room.wordHistory.filter(w => w.playerId === p.id).map(w => w.word);
                          return (
                            <div key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded">
                              <h5 className="text-amber-500 font-bold tracking-widest uppercase text-sm mb-3 truncate" title={p.name}>{p.name}</h5>
                              {words.length > 0 ? (
                                <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                                  {words.map((word, idx) => (
                                    <li key={idx} className="uppercase font-semibold tracking-wide truncate" title={word}>{word}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-600 text-xs italic">No clues</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={handlePlayAgain} className="bg-amber-600 hover:bg-amber-500 text-slate-950 px-8 py-4 w-full sm:w-auto rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                          PLAY AGAIN
                        </button>
                        <button onClick={handleBackToLobby} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-8 py-4 w-full sm:w-auto rounded font-black tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(0,0,0,0.4)]">
                          BACK TO LOBBY
                        </button>
                      </div>
                    )}
                    {!isHost && (
                      <p className="text-slate-500 font-bold uppercase tracking-widest">Waiting for host to play again...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
