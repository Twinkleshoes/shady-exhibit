import {AudioSettings} from './AudioSettings.js';
import React, { useState } from 'react';
import { Play, HelpCircle, LogOut, AlertTriangle, X } from 'lucide-react';

interface EscMenuModalProps {
  isMuted:boolean;
  onToggleMute:()=>void;
  isOpen: boolean;
  onResume: () => void;
  onOpenControls: () => void;
  onLeaveGame: () => void;
}

export const EscMenuModal: React.FC<EscMenuModalProps> = ({
  isMuted,onToggleMute,
  isOpen,
  onResume,
  onOpenControls,
  onLeaveGame,
}) => {
  const [confirmingLeave, setConfirmingLeave] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartLeave = () => {
    setConfirmingLeave(true);
  };

  const handleCancelLeave = () => {
    setConfirmingLeave(false);
  };

  const handleConfirmLeave = () => {
    setConfirmingLeave(false);
    onLeaveGame();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md max-h-[95vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 text-neutral-100 flex flex-col space-y-5">
        <AudioSettings muted={isMuted} onToggleMute={onToggleMute}/>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-neutral-200">
            {confirmingLeave ? 'Confirm Exit' : 'Game Menu · Round stays live'}
          </h2>
          <button
            onClick={onResume}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Resume game"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmingLeave ? (
          /* Confirmation Screen */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">
                Leave this game? The current round will end for everyone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancelLeave}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold transition border border-neutral-700"
              >
                Stay
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-lg shadow-red-600/30 active:scale-95"
              >
                Leave
              </button>
            </div>
          </div>
        ) : (
          /* Main Menu Options */
          <div className="space-y-3">
            <span className="text-[11px] text-neutral-400 block text-center">
              Multiplayer match continues live in the background.
            </span>

            <button
              onClick={onResume}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-black tracking-wide flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
            </button>

            <button
              onClick={() => {
                onResume();
                onOpenControls();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold transition flex items-center justify-center gap-2 border border-neutral-700"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Controls &amp; How to Play</span>
            </button>

            <button
              onClick={handleStartLeave}
              className="w-full py-3.5 px-4 rounded-xl bg-neutral-950 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-bold transition flex items-center justify-center gap-2 border border-red-900/40 hover:border-red-700/60"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Game</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
