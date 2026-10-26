import {useEffect,useRef} from 'react';
import type {ClientGameState} from '../types/game.js';
import {audioEvents,localVolume,musicScene} from '../utils/audio-events.js';
import {soundManager} from '../utils/audio.js';
export function GameAudio({state,interrupted=false}:{state:ClientGameState|null;interrupted?:boolean}){
 const previous=useRef<ClientGameState|null>(null),steps=useRef(new Map<string,number>());
 useEffect(()=>{
  const unlock=()=>{void soundManager.unlock();};
  const click=(e:MouseEvent)=>{if((e.target as Element)?.closest?.('button:not(:disabled)'))soundManager.playClick();};
  const visibility=()=>soundManager.setHidden(document.hidden);
  document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);document.addEventListener('click',click,true);document.addEventListener('visibilitychange',visibility);visibility();
  return()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',visibility);soundManager.dispose();};
 },[]);
 useEffect(()=>{
  soundManager.setScene(interrupted?'quiet':musicScene(state));
  const prev=previous.current;previous.current=state;
  if(!state||interrupted){if(prev||interrupted)soundManager.stopEffects();steps.current.clear();return;}
  if(state.viewingResults&&!prev?.viewingResults)soundManager.stopEffects();
  for(const {cue,volume}of audioEvents(prev,state))soundManager.play(cue,volume);
  if(state.status!=='playing'||prev?.status!=='playing'||prev.roundId!==state.roundId){steps.current.clear();return;}
  // Every museum visitor uses the same distance-based footfall, irrespective of input source/role.
  // CCTV has no microphone, so it cannot expose footsteps outside the selected feed.
  if(state.myRole!=='thief')return;
  const ids=new Set(state.players.map(p=>p.id));for(const id of steps.current.keys())if(!ids.has(id))steps.current.delete(id);
  for(const p of state.players){const old=prev.players.find(b=>b.id===p.id);if(!old||p.isCaptured||p.action!=='walk'){steps.current.delete(p.id);continue;}const distance=Math.hypot(p.x-old.x,p.y-old.y);if(distance>30){steps.current.delete(p.id);continue;}const accumulated=(steps.current.get(p.id)||0)+distance;if(accumulated>=35){soundManager.play('step',localVolume(state,p)*.45);steps.current.set(p.id,accumulated%35);}else steps.current.set(p.id,accumulated);}
 },[state,interrupted]);
 return null;
}
