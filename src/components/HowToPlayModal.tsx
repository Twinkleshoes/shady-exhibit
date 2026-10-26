import {modeConfig,type ModeId} from '../game/modes.js';
import React,{useEffect,useRef} from 'react';
import { Shield, Eye, Ghost, Sparkles, X, Info } from 'lucide-react';

interface HowToPlayModalProps {
  mode?:ModeId;
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  mode='standard',isOpen,
  onClose,
}) => {
  const config=modeConfig(mode);
  const panel=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{if(!isOpen)return;const previous=document.activeElement as HTMLElement;const el=panel.current;el?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();closeRef.current();}if(e.key==='Tab'&&el){const items=[...el.querySelectorAll<HTMLElement>('button,[href],input,[tabindex="0"]')].filter(x=>!x.hasAttribute('disabled')),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);previous?.focus();};},[isOpen]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div ref={panel} role="dialog" aria-modal="true" aria-label="How to Play" className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Info className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">The Shady Exhibit — How to Play</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close rules"
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-neutral-300">
          {/* Overview */}
          <div className="p-4 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
            <h3 className="text-base font-semibold text-amber-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> The Premise
            </h3>
            <p>
              {config.players} players enter the Grand Gallery: <strong className="text-emerald-400">{config.thieves} Shadow {config.thieves===1?'Thief':'Thieves'}</strong> and <strong className="text-cyan-400">1 Security Guard</strong>.
              {config.teammateRescue?'Thieves blend in, steal all three treasures, then escape together.':'One thief blends in, steals the Royal Sapphire and Bronze Sun, then escapes. The Imperial Seal is decorative.'} The Guard monitors the gallery via CCTV camera to identify and apprehend the thieves!
            </p>
          </div>

          {/* Roles Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Shadow Thieves */}
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40">
              <div className="flex items-center gap-2 font-bold text-purple-300 mb-2">
                <Ghost className="w-5 h-5 text-purple-400" />
                <span>Shadow {config.thieves===1?'Thief':'Thieves'} ({config.thieves} {config.thieves===1?'Player':'Players'})</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-neutral-300">
                <li><strong className="text-white">Third-Person View:</strong> Drag with the mouse to orbit your camera around your character.</li>
                <li><strong className="text-white">Camera-Relative WASD:</strong> <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs">W</kbd> moves forward in the direction your camera is pointing.</li>
                <li><strong className="text-white">Shadow Mechanic:</strong> The nearest unobstructed gameplay lamp casts your stylized silhouette, with a switching buffer. <em>Stand closer to the lamp to stretch your shadow longer!</em></li>
                <li><strong className="text-white">Stealing:</strong> Position your shadow's reaching hand onto an active treasure or camera switch{config.teammateRescue?', or rescue switch':''}. Hold <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs">E</kbd> for <strong>3 seconds</strong> without moving away.</li>
                <li><strong className="text-white">F:</strong> Admire an exhibit like an ordinary visitor. Move to stop admiring.</li>
                <li><strong className="text-white">Space:</strong> Grab/release a nearby lamp or movable display. Solid displays block bodies, shadows and CCTV; velvet railings allow shadows through.</li>
                {config.teammateRescue?<><li><strong className="text-white">Rescue:</strong> Hold your shadow on the lavender release switch in the south atrium for three seconds to free all captured teammates.</li></>:<li><strong>Detention:</strong> First capture detains you for eight seconds, then automatically releases you once with a new appearance and unused badge at a concealed location. Collected treasures stay collected; the clock continues. Second capture ends the Duel. No teammate rescue.</li>}
                <li><strong className="text-white">Disrupt:</strong> Orange switches disable their gallery’s vault camera for five seconds after a three-second shadow hold. Security is alerted immediately. Each switch has a 30-second cooldown.</li>
                <li><strong className="text-white">Teamwork:</strong> A physical camera’s red LIVE light means security is viewing it. Idle/disabled cameras have neutral indicators. {config.teammateRescue?'Your fellow thieves have private teammate markers.':'You are the only thief.'} Blend in and don&apos;t get caught!</li>
              </ul>
            </div>

            {/* Security Guard */}
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
              <div className="flex items-center gap-2 font-bold text-cyan-300 mb-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span>Security Guard (1 Player)</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-neutral-300">
                <li><strong className="text-white">3D Surveillance Feeds:</strong> Six feeds cover the atrium, connections, Gem, Sculpture and History galleries. Use the camera buttons or map. Pan with A/D, arrow keys or held on-screen buttons (±50°).</li>
                <li><strong className="text-white">Click to Select:</strong> Click any visitor directly on the 3D feed or from the suspect roster. Exhibit obstacles block line-of-sight!</li>
                <li><strong className="text-white">Biometric Scan:</strong> Start with {config.charges} charges. Click <strong>Inspect Suspect</strong> (costs 1 battery charge).</li>
                <li><strong className="text-white">Apprehension:</strong> Keep the suspect in view for 2 seconds. If they are a thief, they are caught! Panning away cancels the scan without refund. Each spent charge returns after 20 seconds. Switching cameras, disruption or losing sight cancels the scan without refund.</li>
              <li><strong>Guided Tour:</strong> Once per round, confirm the announcement. NPCs gather; it identifies nobody.</li></ul>
            </div>
          </div>

          {/* Win Conditions */}
          <div className="p-4 rounded-xl bg-neutral-800/40 border border-neutral-700/40">
            <h4 className="font-semibold text-neutral-200 mb-2">Win Conditions:</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/40">
                <span className="text-emerald-400 font-bold block mb-1">Thieves Win</span>
                {config.teammateRescue?'Steal all three treasures, then get every uncaptured thief into the green escape zone simultaneously. At least one must be free; captured teammates may be left behind.':'Steal both active treasures (Sapphire and Bronze Sun), then reach the green south atrium escape zone while free.'}
              </div>
              <div className="flex-1 bg-cyan-950/30 p-3 rounded-lg border border-cyan-800/40">
                <span className="text-cyan-400 font-bold block mb-1">Guard Wins</span>
                {config.teammateRescue?'Capture all three thieves simultaneously or let the six-minute timer expire.':'Capture the thief a second time, or let the four-minute timer expire, including during detention.'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl transition-all shadow-md active:scale-95"
          >
            Got it, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
