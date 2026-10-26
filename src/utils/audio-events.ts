import {activeTreasures} from '../game/modes.js';
// SPDX-License-Identifier: Apache-2.0
import type {ClientGameState,Vector2D} from '../types/game.js';
export type Cue='click'|'join'|'grab'|'release'|'theft'|'capture'|'rescue'|'disruption'|'inspect-start'|'inspect-success'|'inspect-cancel'|'warning'|'tour'|'victory'|'defeat'|'step';
export type MusicScene='menu'|'museum'|'escape'|'quiet';
export interface AudioCue {cue:Cue;volume:number}
export function musicScene(s:ClientGameState|null):MusicScene {
 if(s?.viewingResults)return 'quiet';
 if(!s||s.status==='lobby')return 'menu';
 if(s.status!=='playing')return 'quiet';
 return s.treasures.length>0&&activeTreasures(s.treasures).every(t=>t.stolen)?'escape':'museum';
}
export function localVolume(s:ClientGameState,source:Vector2D):number {
 const me=s.players.find(p=>p.isSelf);if(s.myRole!=='thief'||!me||me.isCaptured)return 0;
 const d=Math.hypot(me.x-source.x,me.y-source.y);if(d>=220)return 0;
 // Opaque walls muffle rather than amplify sound; no badge/role-bearing payload.
 let blocked=false;
 for(let i=1;i<20;i++){const x=me.x+(source.x-me.x)*i/20,y=me.y+(source.y-me.y)*i/20;if(s.walls.some(w=>w.type!=='railing'&&x>w.x&&x<w.x+w.width&&y>w.y&&y<w.y+w.height)){blocked=true;break;}}
 return (1-d/220)**2*(blocked?.12:1);
}
/** Diffs only data this client is already entitled to see; never requests extra identities. */
export function audioEvents(prev:ClientGameState|null,next:ClientGameState):AudioCue[]{
 const out:AudioCue[]=[];const add=(cue:Cue,volume=1)=>{if(volume>.005)out.push({cue,volume});};
 if(next.viewingResults&&next.results){if(!prev?.viewingResults&&!next.results.interrupted)add(next.results.winner===(next.myRole==='guard'?'guard':'thieves')?'victory':'defeat');return out;}
 if(next.status==='lobby'&&prev?.roomCode!==next.roomCode)add('join');
 if(!prev||prev.roundId!==next.roundId)return out;
 if(next.status==='gameover'&&prev.status!=='gameover')add(next.winner===(next.myRole==='guard'?'guard':'thieves')?'victory':'defeat');
 if(prev.status!=='playing'||!['playing','gameover'].includes(next.status))return out;
 if(!prev.tour.used&&next.tour.used)add('tour');
 if(next.myRole==='guard'){
  if(!prev.guard.inspecting&&next.guard.inspecting)add('inspect-start');
  // Server alerts are the existing authorized guard channel, including off-feed theft/rescue/disruption.
  let overlap=0;for(let n=Math.min(prev.guard.recentAlerts.length,next.guard.recentAlerts.length);n>0;n--)if(prev.guard.recentAlerts.slice(-n).every((a,i)=>a===next.guard.recentAlerts[i])){overlap=n;break;}
  for(const alert of next.guard.recentAlerts.slice(overlap)){
   if(alert.startsWith('Inspection cancelled'))add('inspect-cancel');
   else if(/detained in|cleared:/.test(alert))add('inspect-success');
   else if(alert.startsWith('THEFT ALERT'))add('theft');
   else if(alert.startsWith('HOLDING ALERT'))add('rescue');
   else if(alert.startsWith('CAMERA ALERT'))add('disruption');
  }
  return out; // Silent CCTV: no remote holder/footstep tracking by sound.
 }
 const me=next.players.find(p=>p.isSelf),old=prev.players.find(p=>p.isSelf);
 if(me&&old){if(!old.isInspected&&me.isInspected)add('warning');if(!old.isCaptured&&me.isCaptured)add('capture');if(old.isCaptured&&!me.isCaptured)add('rescue');}
 for(const lamp of next.lamps){const before=prev.lamps.find(l=>l.id===lamp.id);if(before&&before.holderId!==lamp.holderId){if(before.holderId)add('release',localVolume(next,lamp));if(lamp.holderId)add('grab',localVolume(next,lamp));}}
 for(const t of activeTreasures(next.treasures))if(t.stolen&&!prev.treasures.find(b=>b.id===t.id)?.stolen)add('theft',old?.interactionTargetId===t.id?1:localVolume(next,t));
 for(const sw of next.switches){const before=prev.switches.find(s=>s.id===sw.id);if(sw.kind==='camera'&&before&&sw.cooldown>before.cooldown+.5)add('disruption',old?.interactionTargetId===sw.id?1:localVolume(next,sw));}
 if(me&&!me.isCaptured){
  for(const p of next.players){const before=prev.players.find(b=>b.id===p.id);if(p.isSelf||!before)continue;if(!before.isCaptured&&p.isCaptured)add('capture',localVolume(next,before));}
  if(!old?.isCaptured&&next.players.some(p=>!p.isCaptured&&prev.players.find(b=>b.id===p.id)?.isCaptured)){
   const sw=next.switches.find(s=>s.kind==='rescue');if(sw)add('rescue',old?.interactionTargetId===sw.id?1:localVolume(next,sw));
  }
 }
 return out;
}
