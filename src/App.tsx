import {GameAudio} from './components/GameAudio.js';
import {MatchPreparation} from './components/MatchPreparation.js';
import {ScenePreparationBoundary} from './components/ScenePreparationBoundary.js';
import type {SceneStage} from './game/scene-preparation.js';
import {TourAnnouncement} from './components/TourAnnouncement.js';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState } from './types/game.js';
import { LobbyView } from './components/LobbyView.tsx';
import { Thief3DView } from './components/Thief3DView.tsx';
import { Guard3DView } from './components/Guard3DView.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { HowToPlayModal } from './components/HowToPlayModal.tsx';
import { EscMenuModal } from './components/EscMenuModal.tsx';
import { soundManager } from './utils/audio.js';

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [sceneStatus,setSceneStatus]=useState<{roundId:string;stage:SceneStage}>({roundId:'',stage:'graphics'});
  const currentState=useRef(gameState);currentState.current=gameState;
  useEffect(()=>{const status=(event:Event)=>{const detail=(event as CustomEvent).detail;if(!detail||detail.roundId!==currentState.current?.roundId)return;setSceneStatus(detail);if(detail.stage==='error')socket?.emit('scene_failed',{roundId:detail.roundId});};window.addEventListener('museum-scene-status',status);return()=>window.removeEventListener('museum-scene-status',status);},[socket]);
  const [playerName, setPlayerName] = useState<string>(() => {
    try{return localStorage.getItem('shady_player_name') || `Visitor_${Math.floor(Math.random() * 900 + 100)}`;}catch{return 'Visitor';}
  });
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isEscMenuOpen, setIsEscMenuOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(()=>{try{return localStorage.getItem('shady_muted')==='true';}catch{return false;}});
  useEffect(()=>{soundManager.setMuted(isMuted);try{localStorage.setItem('shady_muted',String(isMuted));}catch{}},[isMuted]);
  const [disconnectedRound,setDisconnectedRound]=useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try{localStorage.setItem('shady_player_name', playerName);}catch{}
  }, [playerName]);

  const toggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  const handleLeaveRoom = () => {
    soundManager.playClick();
    socket?.emit('leave_room');
    setGameState(null);
    setIsEscMenuOpen(false);
  };

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    let errorTimer:ReturnType<typeof setTimeout>|undefined;
    s.on('connect', () => {
      console.log('Connected to Shady Exhibit multiplayer server:', s.id);
    });

    s.on('state_update', (state: ClientGameState) => {
      (window as unknown as { gameState: ClientGameState }).gameState = state;
      setGameState(state);
      if(['loading','briefing','countdown'].includes(state.status)){setIsEscMenuOpen(false);setIsHowToPlayOpen(false);}
      // If round ended or transitioned back to lobby while Esc menu was open, close Esc menu
      if (state.status === 'lobby' || state.status === 'gameover') {
        setIsEscMenuOpen(false);
      }
    });

    s.on('disconnect',()=> { if(currentState.current&&['loading','briefing','countdown','playing'].includes(currentState.current.status))setDisconnectedRound(true);setGameState(null); setIsEscMenuOpen(false); setToastMessage('Connection lost. Rejoin your room after reconnecting.'); });

    s.on('left_room_confirmed', () => {
      setGameState(null);
      setIsEscMenuOpen(false);
    });

    s.on('error_message', ({ message }: { message: string }) => {
      setToastMessage(message);
      soundManager.playAlert();
      clearTimeout(errorTimer);errorTimer=setTimeout(() => setToastMessage(null), 10000);
    });

    setSocket(s);

    return () => {
      clearTimeout(errorTimer);s.disconnect();
    };
  }, []);

  const isInActiveGame =
    gameState &&
    gameState.status !== 'lobby' && gameState.status !== 'gameover';
  const localStage=sceneStatus.roundId===gameState?.roundId?sceneStatus.stage:'graphics';
  const isPreparing=!!gameState&&['loading','briefing','countdown'].includes(gameState.status);

  return (
    <div className="min-h-screen bg-black font-sans antialiased select-none text-neutral-100">
      <GameAudio state={gameState} interrupted={disconnectedRound}/>
      {disconnectedRound&&<div className="results-screen results-still"><section className="results-file" role="dialog" aria-modal="true" aria-labelledby="connection-result-title"><header className="results-heading"><div><span className="results-eyebrow">THE SHADY EXHIBIT · CONNECTION LOST</span><h2 id="connection-result-title">Round Interrupted</h2><p>Your connection to the museum was lost. No winner is awarded for an interrupted round. The final server report is unavailable on this device.</p></div></header><footer className="results-actions"><button autoFocus onClick={()=>{setDisconnectedRound(false);setToastMessage(null);}}>Main Menu</button></footer></section></div>}
      {/* Global Toast Banner */}
      {toastMessage && isInActiveGame && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-red-600/95 border border-red-400 text-white font-bold text-xs shadow-2xl animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 underline text-[11px] opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {gameState&&<TourAnnouncement state={gameState}/>}

      {/* View routing based on match state & assigned role */}
      {!isInActiveGame ? (
        <div inert={gameState?.viewingResults||disconnectedRound?true:undefined} aria-hidden={gameState?.viewingResults||disconnectedRound||undefined}><LobbyView
          socket={socket}
          gameState={gameState}
          playerName={playerName}
          setPlayerName={setPlayerName}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onLeaveLobby={handleLeaveRoom}
          serverMessage={toastMessage}
          onDismissMessage={()=>setToastMessage(null)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        /></div>
      ) : <><div aria-hidden={isPreparing} inert={isPreparing?true:undefined}><ScenePreparationBoundary key={gameState.roundId} roundId={gameState.roundId}>{gameState.myRole === 'guard' ? (
        <Guard3DView
          isInputEnabled={!isEscMenuOpen && !isHowToPlayOpen && localStage!=='error' && gameState.status==='playing'}
          socket={socket}
          gameState={gameState}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenEscMenu={() => setIsEscMenuOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      ) : (
        <Thief3DView
          isInputEnabled={!isEscMenuOpen && !isHowToPlayOpen && localStage!=='error' && gameState.status==='playing'}
          socket={socket}
          gameState={gameState}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenEscMenu={() => setIsEscMenuOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}</ScenePreparationBoundary></div><MatchPreparation state={gameState} stage={localStage} onReady={()=>socket?.emit('briefing_ready',{roundId:gameState.roundId})} onLeave={handleLeaveRoom}/></>}



      {/* Game Over Modal */}
      {gameState && (
        <GameOverModal
          socket={socket}
          gameState={gameState}
          onMainMenu={handleLeaveRoom}
        />
      )}

      {/* In-Game Esc Menu Modal */}
      <EscMenuModal
        isOpen={isEscMenuOpen}
        onResume={() => setIsEscMenuOpen(false)}
        onOpenControls={() => setIsHowToPlayOpen(true)}
        onLeaveGame={handleLeaveRoom}
        isMuted={isMuted} onToggleMute={toggleMute}
      />

      {/* How To Play Modal */}
      <HowToPlayModal
        mode={gameState?.mode}
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />
    </div>
  );
}
