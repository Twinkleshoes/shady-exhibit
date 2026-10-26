import {modeConfig,activeTreasures} from '../game/modes.js';
import {TOUR_MEETING,tourActive} from '../game/tour-shared.js';
import React from 'react';
import type {ClientGameState} from '../types/game.js';
import {CAMERAS} from '../game/cameras.js';
import {ROOMS,ESCAPE,HOLDING,roomName,inside} from '../game/world.js';
export function MissionStatus({state}:{state:ClientGameState}) {
 const seconds=Math.ceil(state.roundTimeLeft),objectives=activeTreasures(state.treasures),stolen=objectives.filter(t=>t.stolen).length,config=modeConfig(state.mode);
 return <div className="rounded-xl bg-neutral-900/95 border border-neutral-600 px-4 py-2 text-center text-xs text-neutral-200">
  <div className="flex items-center justify-center gap-4"><strong className={`font-mono text-lg ${seconds<60?'text-red-400':'text-amber-200'}`}>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong><span>{stolen}/{objectives.length} treasures secured · {config.name}</span></div>
  <div className="flex gap-2 justify-center text-[10px]">{state.treasures.map(t=><span key={t.id} className={t.stolen?'text-emerald-300':'text-neutral-400'}>{t.active===false?'○':t.stolen?'✓':'◇'} {t.name.split(' ').at(-1)}{t.active===false?' (decorative)':''}</span>)}</div>
  {stolen===objectives.length&&<div className="text-emerald-300 mt-1 font-bold">{config.teammateRescue?'All free thieves → south atrium escape zone together':'Thief → south atrium escape zone while free'}</div>}
 {state.duel&&<div className="text-amber-200 mt-1">Captures: {state.duel.captures}/{config.capturesToWin} · {state.duel.releaseUsed?'Automatic release used':'One automatic release available'}</div>}
 </div>;
}
export function MuseumMap({state,onCamera}:{state:ClientGameState;onCamera?:(id:string)=>void}) {
 const guard=state.myRole==='guard',me=state.players.find(p=>p.isSelf);
 return <div className="bg-neutral-900/95 border border-neutral-600 rounded-xl p-2 text-[10px] text-neutral-300 w-[320px] max-w-full">
  <div className="flex justify-between mb-1"><strong>{guard?'CAMERA MAP':me?roomName(me):'MUSEUM MAP'}</strong><span>{guard?'Click a camera':modeConfig(state.mode).teammateRescue?'Blue: you · purple: team':'Blue: you'}</span></div>
  <svg viewBox="-30 -30 1460 1460" role="img" aria-label="Atrium museum floor map" className="w-full max-h-[260px]">
   {ROOMS.map(g=><g key={g.id}><rect x={g.x} y={g.y} width={g.width} height={g.height} fill={'#'+g.color.toString(16)} stroke="#8e897e" strokeWidth="5"/><text x={g.x+g.width/2} y={g.id==='atrium'?650:g.id==='south'?1345:g.id==='sculpture'||g.id==='history'?1240:g.y+70} textAnchor="middle" fill="#27333b" fontSize={g.id.includes("-")?36:58}>{g.id==='atrium'?'Atrium':g.id==='south'?'South loop':g.id==='sculpture-study'?'Study bay':g.id==='history-intro'?'Origins':g.name.replace(' Gallery','')}</text></g>)}
   {state.walls.filter(w=>!w.id.startsWith('display')).map(w=><rect key={w.id} x={w.x} y={w.y} width={w.width} height={w.height} fill={w.type==='railing'?'#b78162':'#766c60'}/>)}
   <rect {...HOLDING} fill="#8a65b6"/>
   <rect {...ESCAPE} fill={activeTreasures(state.treasures).every(t=>t.stolen)?'#72dca2':'#537a66'}/>
   {state.movables.map(m=><rect key={m.id} x={m.x} y={m.y} width={m.width} height={m.height} fill="#b8c8c0"/>)}
   {state.lamps.map(l=><circle key={l.id} cx={l.x} cy={l.y} r="20" fill="#fff3bc" stroke="#e9b34f" strokeWidth="7"/>)}
   {state.treasures.map(t=><circle key={t.id} cx={t.x} cy={t.y} r="26" fill={t.active===false||t.stolen?'#374151':'#f6dc87'}/>)}
   {state.switches.map(sw=><rect key={sw.id} x={sw.x-17} y={sw.y-17} width="34" height="34" fill={sw.cooldown>0?'#888':sw.kind==='rescue'?'#c39af3':'#f4a94c'}/>)}
   {!guard&&state.players.filter(p=>p.isSelf||p.isTeammate).map(p=><circle key={p.id} cx={p.x} cy={p.y} r="23" fill={p.isCaptured?'#f87171':p.isSelf?'#49c9ff':'#c496f4'}/>)}
   {state.status==='playing'&&tourActive(state.tour)&&<g><circle cx={TOUR_MEETING.x} cy={TOUR_MEETING.y} r="50" fill="#15baca" stroke="#eefcff" strokeWidth="8"/><text x={TOUR_MEETING.x} y={TOUR_MEETING.y+15} fontSize="44" fill="#082f49" textAnchor="middle">T</text></g>}
   {guard&&CAMERAS.map((c,i)=>{
    const x=c.position[0]/.05+400,y=c.position[2]/.05+300;
    return <g key={c.id} onClick={()=>onCamera?.(c.id)} style={{cursor:'pointer'}} role="button" tabIndex={0} aria-label={`Map ${c.id}`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onCamera?.(c.id);}}>
     <circle cx={x} cy={y} r="55" fill={state.guard.disabledCameras[c.id]>0?'#b45353':state.guard.activeCameraId===c.id?'#2bb483':'#ddd1ad'}/><text x={x} y={y+18} textAnchor="middle" fontSize="52" fill="#122b2c">{i+1}</text>
    </g>;
   })}
  </svg>
  {!guard&&<div>Gold: treasure · white: lamp · orange: jammer{modeConfig(state.mode).teammateRescue?' · lavender: rescue':''} · green: escape{me&&inside(me,ESCAPE)?' · You are in escape':''}</div>}
 </div>;
}
