import React, { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Ghost, Eye, AlertTriangle, Sparkles, ShieldAlert, Volume2, VolumeX, HelpCircle, Menu } from 'lucide-react';
import { ClientGameState } from '../types/game.js';
import { soundManager } from '../utils/audio.js';
import { isShadowTouchingTreasure } from '../game/physics.js';

interface ThiefViewProps {
  socket: Socket | null;
  gameState: ClientGameState;
  onOpenHowToPlay: () => void;
  onOpenEscMenu: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ThiefView: React.FC<ThiefViewProps> = ({
  socket,
  gameState,
  onOpenHowToPlay,
  onOpenEscMenu,
  isMuted,
  onToggleMute,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysDown = useRef<{ [key: string]: boolean }>({});
  const isStealingRef = useRef<boolean>(false);

  const me = gameState.players.find((p) => p.isSelf);
  const myBadge = me?.badgeNumber || 101;
  const isCaptured = me?.isCaptured || false;
  const isInspected = me?.isInspected || false;

  // Sound feedback on inspection warning
  useEffect(() => {
    if (isInspected) {
      soundManager.playAlert();
    }
  }, [isInspected]);

  // Keyboard input loop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept inputs inside text fields
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (e.code === 'Escape' || e.key === 'Escape') {
        onOpenEscMenu();
        return;
      }

      keysDown.current[e.code] = true;

      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && !isStealingRef.current) {
        if (!isCaptured) {
          isStealingRef.current = true;
          socket?.emit('start_theft');
          soundManager.playClick();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        isStealingRef.current = false;
        socket?.emit('cancel_theft');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Movement dispatch timer
    const interval = setInterval(() => {
      if (isCaptured) return;

      let dx = 0;
      let dy = 0;

      if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) dy -= 1;
      if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) dy += 1;
      if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) dx -= 1;
      if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        socket?.emit('player_move', { dx, dy });
      }
    }, 1000 / 30);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
    };
  }, [socket, isCaptured]);

  // 2D Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Gallery Floor (Parquet Museum Pattern)
      ctx.fillStyle = '#1c1917'; // warm stone background
      ctx.fillRect(0, 0, width, height);

      // Floor grid tiles
      ctx.strokeStyle = '#292524';
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

      // Carpet runner leading across the room
      ctx.fillStyle = '#450a0a33'; // deep velvet crimson runner
      ctx.fillRect(160, 240, 480, 120);

      // 2. Draw Lamp Glow & Light Field
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
        glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
        glowGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.18)');
        glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 320, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Draw Shadows of all players
      for (const p of gameState.players) {
        if (!p.shadow.active) continue;

        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 12, 0.65)';
        ctx.beginPath();

        // Shadow arm geometry
        const perpX = -p.shadow.dirY * 8;
        const perpY = p.shadow.dirX * 8;

        ctx.moveTo(p.x - perpX, p.y - perpY);
        ctx.lineTo(p.x + perpX, p.y + perpY);
        ctx.lineTo(p.shadow.handX + perpX * 0.4, p.shadow.handY + perpY * 0.4);
        ctx.lineTo(p.shadow.handX - perpX * 0.4, p.shadow.handY - perpY * 0.4);
        ctx.closePath();
        ctx.fill();

        // Hand tip with reaching fingers
        ctx.beginPath();
        ctx.arc(p.shadow.handX, p.shadow.handY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Draw 3 reaching claw/fingers at tip
        for (let i = -1; i <= 1; i++) {
          const fingerAngle = p.shadow.angle + i * 0.35;
          const fx = p.shadow.handX + Math.cos(fingerAngle) * 7;
          const fy = p.shadow.handY + Math.sin(fingerAngle) * 7;
          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Check if hand reaches the treasure
        if (
          gameState.treasure &&
          !gameState.treasure.stolen &&
          isShadowTouchingTreasure(p.shadow, gameState.treasure)
        ) {
          // Sparkle halo around hand
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.shadow.handX, p.shadow.handY, 16, 0, Math.PI * 2);
          ctx.stroke();

          // Sparkle pulse
          ctx.fillStyle = '#67e8f9';
          ctx.font = '10px sans-serif';
          ctx.fillText('✨ REACH', p.shadow.handX - 18, p.shadow.handY - 14);
        }

        ctx.restore();
      }

      // 4. Draw Treasure & Pedestal
      const treasure = gameState.treasure;
      if (treasure) {
        // Pedestal base
        ctx.fillStyle = '#44403c';
        ctx.strokeStyle = '#78716c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(treasure.x - 24, treasure.y - 24, 48, 48, 8);
        ctx.fill();
        ctx.stroke();

        // Velvet cushion inside
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(treasure.x, treasure.y, 16, 0, Math.PI * 2);
        ctx.fill();

        if (!treasure.stolen) {
          // Royal Sapphire
          ctx.save();
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          // Gem facet polygon
          ctx.moveTo(treasure.x, treasure.y - 12);
          ctx.lineTo(treasure.x + 10, treasure.y - 2);
          ctx.lineTo(treasure.x + 6, treasure.y + 11);
          ctx.lineTo(treasure.x - 6, treasure.y + 11);
          ctx.lineTo(treasure.x - 10, treasure.y - 2);
          ctx.closePath();
          ctx.fill();

          // Inner highlight facet
          ctx.fillStyle = '#7dd3fc';
          ctx.beginPath();
          ctx.arc(treasure.x - 2, treasure.y - 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Label
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ROYAL SAPPHIRE', treasure.x, treasure.y + 36);
        } else {
          // Stolen empty pedestal marker
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('[STOLEN]', treasure.x, treasure.y + 34);
        }
      }

      // 5. Draw Walls & Obstacles
      for (const wall of gameState.walls) {
        if (wall.type === 'railing') {
          // Velvet museum rope & brass stanchions (allows shadows through!)
          ctx.fillStyle = 'rgba(180, 83, 9, 0.3)';
          ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

          // Red velvet rope core
          ctx.fillStyle = '#991b1b';
          if (wall.width > wall.height) {
            ctx.fillRect(wall.x, wall.y + wall.height / 2 - 2, wall.width, 4);
          } else {
            ctx.fillRect(wall.x + wall.width / 2 - 2, wall.y, 4, wall.height);
          }
        } else {
          // Drop shadow for solid wall depth
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(wall.x + 4, wall.y + 4, wall.width, wall.height);

          // Wall surface
          ctx.fillStyle = '#292524';
          ctx.strokeStyle = '#57534e';
          ctx.lineWidth = 2;
          ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
          ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

          // Top bevel / trim
          ctx.fillStyle = '#44403c';
          ctx.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, 4);
        }
      }

      // 6. Draw Lamp Fixture
      if (lamp) {
        // Lamp stand
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing bulb center
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LAMP', lamp.x, lamp.y - 22);
      }

      // 7. Draw Characters (Visitors / Thieves)
      for (const p of gameState.players) {
        ctx.save();

        // Halo under self
        if (p.isSelf) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Teammate marker (visible ONLY to thieves!)
        if (p.isTeammate) {
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.arc(p.x, p.y - 28, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f3e8ff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ALLY', p.x, p.y - 36);
        }

        // Character coat / body
        ctx.fillStyle = p.isCaptured ? '#52525b' : p.isSelf ? '#1e3a8a' : '#1e293b';
        ctx.strokeStyle = p.isCaptured ? '#ef4444' : '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 4, 7, 0, Math.PI * 2);
        ctx.fill();

        // Badge Number on chest
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(p.x - 11, p.y + 4, 22, 10, 3);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`#${p.badgeNumber}`, p.x, p.y + 12);

        // Name tag
        ctx.fillStyle = p.isSelf ? '#fde047' : '#cbd5e1';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y + 26);

        // Captured status badge
        if (p.isCaptured) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('APPREHENDED', p.x, p.y - 20);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  const touchingTreasure =
    me &&
    gameState.treasure &&
    !gameState.treasure.stolen &&
    isShadowTouchingTreasure(me.shadow, gameState.treasure);

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between">
      {/* Top Header / HUD */}
      <header className="px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-purple-300">
                ROLE: SHADOW THIEF
              </span>
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-xs font-mono font-bold border border-neutral-700">
                Badge #{myBadge}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Target: Stretch shadow to the Royal Sapphire & hold E for 3 seconds.
            </p>
          </div>
        </div>

        {/* Camera indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
              CAM 01 ACTIVE
            </span>
          </div>

          <button
            onClick={onOpenHowToPlay}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors border border-neutral-700"
            aria-label="How to play instructions"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors border border-neutral-700"
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onOpenEscMenu}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors border border-neutral-700 flex items-center gap-1.5"
            aria-label="Game menu"
          >
            <Menu className="w-4 h-4 text-neutral-300" />
            <span className="hidden sm:inline">Menu</span>
            <kbd className="hidden sm:inline text-[10px] px-1 bg-neutral-900 rounded text-neutral-400">Esc</kbd>
          </button>
        </div>
      </header>

      {/* Main Museum Canvas Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
        {/* Full-screen Warning Flash if inspected */}
        {isInspected && (
          <div className="absolute top-6 z-20 px-6 py-2.5 rounded-xl bg-red-600/90 border-2 border-red-400 text-white font-black text-sm flex items-center gap-2 shadow-2xl animate-bounce">
            <AlertTriangle className="w-5 h-5 text-yellow-300" />
            <span>WARNING: THE SECURITY GUARD IS SCANNING YOUR BADGE! BREAK SIGHT!</span>
          </div>
        )}

        {isCaptured && (
          <div className="absolute top-6 z-20 px-6 py-3 rounded-xl bg-neutral-900/95 border border-red-500 text-red-400 font-bold text-sm flex items-center gap-2 shadow-2xl">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span>YOU ARE APPREHENDED! Watch the rest of the heist unfold.</span>
          </div>
        )}

        {/* Canvas Frame */}
        <div className="relative rounded-2xl overflow-hidden border-4 border-neutral-800 shadow-2xl bg-black">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="block max-w-full h-auto"
          />

          {/* Contextual Stealing Overlay */}
          {touchingTreasure && !isCaptured && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-amber-500/40 rounded-xl px-5 py-3 shadow-2xl flex flex-col items-center gap-2 min-w-[280px]">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>SHADOW IN REACH OF ROYAL SAPPHIRE</span>
              </div>

              {gameState.theft.inProgress ? (
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-300">
                    <span>STEALING HEIST IN PROGRESS</span>
                    <span className="font-bold text-amber-400">
                      {Math.round(gameState.theft.progress * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-75"
                      style={{ width: `${gameState.theft.progress * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 block text-center">
                    Keep holding <kbd className="px-1 bg-neutral-800 rounded font-bold">E</kbd>! Don&apos;t move away!
                  </span>
                </div>
              ) : (
                <div className="text-xs text-neutral-200 flex items-center gap-1.5">
                  <span>Hold</span>
                  <kbd className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-xs shadow">
                    E
                  </kbd>
                  <span>for 3 seconds to steal!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Instructions Footer */}
      <footer className="px-4 py-2.5 bg-neutral-900/90 border-t border-neutral-800 text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono">
              WASD
            </kbd>{' '}
            Move
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono">
              E
            </kbd>{' '}
            Steal when shadow touches gem
          </span>
          <span className="text-purple-300 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Teammates marked with violet dot
          </span>
        </div>
        <div>Move closer to the center lamp to make your shadow arm longer.</div>
      </footer>
    </div>
  );
};
