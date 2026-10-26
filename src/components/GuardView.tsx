import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Shield, Battery, BatteryCharging, Radio, AlertOctagon, HelpCircle, Volume2, VolumeX, Eye, CheckCircle2, Menu } from 'lucide-react';
import { ClientGameState } from '../types/game.js';
import { soundManager } from '../utils/audio.js';

interface GuardViewProps {
  socket: Socket | null;
  gameState: ClientGameState;
  onOpenHowToPlay: () => void;
  onOpenEscMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GuardView: React.FC<GuardViewProps> = ({
  socket,
  gameState,
  onOpenHowToPlay,
  onOpenEscMenu,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Escape key handler for game menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenEscMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenEscMenu]);

  // Clock ticker for security camera overlay
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour12: false }) +
          '.' +
          String(Math.floor(now.getMilliseconds() / 100))
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  const selectedSuspect = gameState.players.find((p) => p.badgeNumber === selectedBadge);
  const isSelectedCaptured = !!selectedSuspect?.isCaptured;

  // Inspect Suspect handler
  const handleInspect = () => {
    if (!selectedBadge || isSelectedCaptured) return;
    if (gameState.guard.charges <= 0) {
      soundManager.playAlert();
      return;
    }
    soundManager.playClick();
    socket?.emit('guard_inspect', { targetBadgeNumber: selectedBadge });
  };

  // Canvas click handler to select visitors by clicking on them
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked visitor
    for (const p of gameState.players) {
      const dx = p.x - clickX;
      const dy = p.y - clickY;
      if (dx * dx + dy * dy <= 28 * 28) {
        setSelectedBadge(p.badgeNumber);
        soundManager.playClick();
        return;
      }
    }
  };

  // 2D CCTV Camera rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. CCTV Monochromatic / Desaturated Museum Floor
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      // Floor grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const tileSize = 40;
      for (let x = 0; x < width; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Lamp Glow (surveillance view)
      const lamp = gameState.lamp;
      if (lamp) {
        const glowGrad = ctx.createRadialGradient(
          lamp.x,
          lamp.y,
          10,
          lamp.x,
          lamp.y,
          320
        );
        glowGrad.addColorStop(0, 'rgba(234, 179, 8, 0.35)');
        glowGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.1)');
        glowGrad.addColorStop(1, 'rgba(234, 179, 8, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 320, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw Shadows of visitors
      for (const p of gameState.players) {
        if (!p.shadow.active) continue;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();

        const perpX = -p.shadow.dirY * 8;
        const perpY = p.shadow.dirX * 8;

        ctx.moveTo(p.x - perpX, p.y - perpY);
        ctx.lineTo(p.x + perpX, p.y + perpY);
        ctx.lineTo(p.shadow.handX + perpX * 0.4, p.shadow.handY + perpY * 0.4);
        ctx.lineTo(p.shadow.handX - perpX * 0.4, p.shadow.handY - perpY * 0.4);
        ctx.closePath();
        ctx.fill();

        // Hand tip with fingers
        ctx.beginPath();
        ctx.arc(p.shadow.handX, p.shadow.handY, 9, 0, Math.PI * 2);
        ctx.fill();

        for (let i = -1; i <= 1; i++) {
          const fingerAngle = p.shadow.angle + i * 0.35;
          const fx = p.shadow.handX + Math.cos(fingerAngle) * 7;
          const fy = p.shadow.handY + Math.sin(fingerAngle) * 7;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // 4. Draw Treasure Pedestal
      const treasure = gameState.treasure;
      if (treasure) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(treasure.x - 24, treasure.y - 24, 48, 48, 8);
        ctx.fill();
        ctx.stroke();

        if (!treasure.stolen) {
          // Sapphire gem
          ctx.save();
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.moveTo(treasure.x, treasure.y - 12);
          ctx.lineTo(treasure.x + 10, treasure.y - 2);
          ctx.lineTo(treasure.x + 6, treasure.y + 11);
          ctx.lineTo(treasure.x - 6, treasure.y + 11);
          ctx.lineTo(treasure.x - 10, treasure.y - 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('EXHIBIT: SAPPHIRE', treasure.x, treasure.y + 36);
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!! ASSET STOLEN !!', treasure.x, treasure.y + 36);
        }
      }

      // 5. Walls & Barriers
      for (const wall of gameState.walls) {
        if (wall.type === 'railing') {
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
          ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
        }
      }

      // 6. Lamp
      if (lamp) {
        ctx.fillStyle = '#854d0e';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Draw Visitors (Suspects)
      for (const p of gameState.players) {
        ctx.save();

        const isSelected = selectedBadge === p.badgeNumber;
        const isBeingInspected = gameState.guard.inspecting?.targetBadge === p.badgeNumber;

        // Selection / Inspection crosshair box
        if (isSelected || isBeingInspected) {
          ctx.strokeStyle = isBeingInspected ? '#ef4444' : '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.strokeRect(p.x - 22, p.y - 22, 44, 44);

          // Corner brackets
          const bracketLen = 6;
          ctx.strokeRect(p.x - 24, p.y - 24, bracketLen, 2);
          ctx.strokeRect(p.x + 24 - bracketLen, p.y - 24, bracketLen, 2);
          ctx.strokeRect(p.x - 24, p.y + 22, bracketLen, 2);
          ctx.strokeRect(p.x + 24 - bracketLen, p.y + 22, bracketLen, 2);

          // Reticle label
          ctx.fillStyle = isBeingInspected ? '#f87171' : '#7dd3fc';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            isBeingInspected ? 'SCANNING...' : 'TARGET LOCK',
            p.x,
            p.y - 28
          );
        }

        // Visitor avatar circle (uniform colors so guard must observe actions)
        ctx.fillStyle = p.isCaptured ? '#475569' : '#334155';
        ctx.strokeStyle = p.isCaptured ? '#ef4444' : '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, 7, 0, Math.PI * 2);
        ctx.fill();

        // Badge number tag
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(p.x - 12, p.y + 4, 24, 11, 3);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`#${p.badgeNumber}`, p.x, p.y + 13);

        if (p.isCaptured) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('[CAPTURED]', p.x, p.y + 28);
        }

        ctx.restore();
      }

      // 8. CCTV Scanlines & Monitor Overlays
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // Camera feed overlay HUD
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CAM 01 - MAIN EXHIBIT HALL', 18, 28);
      ctx.fillText(`TIME: ${currentTime}`, 18, 46);

      // Blinking live indicator
      const blink = Math.floor(Date.now() / 600) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(width - 64, 24, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('REC [LIVE]', width - 18, 28);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gameState, selectedBadge, currentTime]);

  const activeInspection = gameState.guard.inspecting;
  const isCurrentlyInspecting = !!activeInspection;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-cyan-300">
              ROLE: SECURITY GUARD (CCTV CONTROL)
            </h1>
            <p className="text-xs text-neutral-400">
              Watch shadows for suspicious reaching, target suspects, and execute optical biometric scans.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onOpenEscMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition border border-neutral-700 text-xs font-bold"
            title="Open Menu (Esc)"
          >
            <Menu className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Menu</span>
            <kbd className="text-[10px] bg-neutral-900 px-1 py-0.5 rounded border border-neutral-700 font-mono">Esc</kbd>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
              TERMINAL ONLINE
            </span>
          </div>

          <button
            onClick={onOpenHowToPlay}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition border border-neutral-700"
            aria-label="How to play instructions"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition border border-neutral-700"
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main CCTV Workspace (Camera View + Security Console) */}
      <main className="flex-1 p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 max-w-7xl w-full mx-auto">
        {/* CCTV Monitor View (3 columns on lg) */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center">
          <div className="relative rounded-2xl overflow-hidden border-4 border-neutral-800 shadow-2xl bg-black w-full max-w-[800px]">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onClick={handleCanvasClick}
              className="block w-full h-auto cursor-crosshair"
            />
          </div>
          <span className="text-xs text-neutral-400 mt-2">
            Click on any visitor on the camera feed or suspect list to target them for inspection.
          </span>
        </div>

        {/* Security Console (1 column) */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Inspection Charges Panel */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-cyan-400" />
                <span>Inspection Charges</span>
              </span>
              <span className="font-mono font-bold text-sm text-cyan-300">
                {gameState.guard.charges} / {gameState.guard.maxCharges}
              </span>
            </div>

            {/* Battery Level Indicators */}
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((idx) => {
                const isCharged = idx < gameState.guard.charges;
                return (
                  <div
                    key={idx}
                    className={`h-3 rounded-md transition-all ${
                      isCharged
                        ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50'
                        : 'bg-neutral-800 border border-neutral-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Cooldown Timer Feedback */}
            {gameState.guard.rechargingTimeLeft.length > 0 && (
              <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Recharging next charge: {Math.ceil(gameState.guard.rechargingTimeLeft[0])}s
                </span>
              </div>
            )}
          </div>

          {/* Suspect Target & Inspection Action */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Targeted Suspect</span>
              </span>
              {selectedBadge && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isSelectedCaptured
                    ? 'bg-red-950 text-red-400 border-red-800'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                }`}>
                  #{selectedBadge} {isSelectedCaptured && '(APPREHENDED)'}
                </span>
              )}
            </div>

            {/* Suspect Selector Pill List */}
            <div className="grid grid-cols-2 gap-2">
              {gameState.players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedBadge(p.badgeNumber);
                    soundManager.playClick();
                  }}
                  className={`p-2 rounded-lg text-left text-xs font-mono transition border ${
                    selectedBadge === p.badgeNumber
                      ? p.isCaptured
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                      : p.isCaptured
                      ? 'bg-neutral-950/60 border-red-900/40 text-neutral-400 opacity-70 hover:opacity-100'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Suspect #{p.badgeNumber}</span>
                  </div>
                  <div className={`text-[10px] ${p.isCaptured ? 'text-red-400 font-bold' : 'text-neutral-400'}`}>
                    {p.isCaptured ? 'Apprehended' : 'In Gallery'}
                  </div>
                </button>
              ))}
            </div>

            {/* Inspect Button & Progress */}
            <div>
              <button
                onClick={handleInspect}
                disabled={
                  !selectedBadge ||
                  isSelectedCaptured ||
                  gameState.guard.charges <= 0 ||
                  isCurrentlyInspecting
                }
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg ${
                  !selectedBadge ||
                  isSelectedCaptured ||
                  gameState.guard.charges <= 0 ||
                  isCurrentlyInspecting
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 active:scale-98 shadow-cyan-500/20 cursor-pointer'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>
                  {isCurrentlyInspecting
                    ? 'SCANNING SUSPECT...'
                    : isSelectedCaptured
                    ? 'SUSPECT APPREHENDED'
                    : selectedBadge
                    ? `INSPECT #${selectedBadge} (1 CHARGE)`
                    : 'SELECT A SUSPECT'}
                </span>
              </button>

              {isCurrentlyInspecting && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-cyan-300">
                    <span>BIOMETRIC SCAN</span>
                    <span>{Math.round(activeInspection.progress * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-75"
                      style={{ width: `${activeInspection.progress * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 block text-center">
                    Keep suspect in view for 2 seconds to confirm role!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CCTV Alerts Feed */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex-1 flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Security Terminal Log</span>
            </span>
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 flex-1 overflow-y-auto max-h-36 font-mono text-[11px] space-y-1 text-neutral-300">
              {gameState.guard.recentAlerts.map((alert, idx) => (
                <div key={idx} className="leading-tight text-neutral-400">
                  <span className="text-cyan-400">&gt;</span> {alert}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-2 bg-neutral-900 border-t border-neutral-800 text-xs text-neutral-400 text-center font-mono">
        CCTV SYSTEM v1.0 &bull; 1080p Optical Feed &bull; Direct Biometric Uplink
      </footer>
    </div>
  );
};
