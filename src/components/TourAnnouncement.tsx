import React from 'react';
import type {ClientGameState} from '../types/game.js';
import {TOUR_MEETING,tourActive} from '../game/tour-shared.js';
export function TourAnnouncement({state}:{state:ClientGameState}){
 const active=state.status==='playing'&&tourActive(state.tour);
 if(!active)return null;
 return <div role="status" aria-live="polite" className="fixed top-28 left-1/2 -translate-x-1/2 z-30 max-w-[420px] rounded-xl border border-cyan-300/70 bg-slate-950/95 text-cyan-50 px-5 py-3 text-center shadow-xl pointer-events-none">
  <strong>{state.tour.elapsed<8?'Museum announcement · Guided Tour':'Guided Tour meeting point'}</strong>
  <div className="text-sm mt-1">{TOUR_MEETING.name}</div>
  <div className="text-xs mt-1 text-cyan-200">{state.tour.phase==='gathering'?`Gathering · ${Math.ceil(state.tour.gatherRemaining)}s remaining`:'Visitors are making their way to the meeting point.'}</div>
 </div>;
}
