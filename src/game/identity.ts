import {randomInt} from 'node:crypto';
import {PUBLIC_SPAWNS,THIEF_SPAWN_CHOICES} from './world.js';
import {APPEARANCES} from './appearances.js';
import type {GameRoom,ServerPlayer} from '../types/game.js';
/** Badges are retired for the entire round, so stale requests cannot hit a new visitor. */
export function freshBadge(room:GameRoom){
 const unused=Array.from({length:899},(_,i)=>101+i).filter(n=>!room.usedBadges.includes(n));
 if(!unused.length)throw new Error('Round badge pool exhausted');
 const badge=unused[randomInt(unused.length)];room.usedBadges.push(badge);return badge;
}
export function replaceDisguise(room:GameRoom,p:ServerPlayer){
 const old=p.appearanceId,choice=randomInt(APPEARANCES.length-1);
 p.appearanceId=choice>=old?choice+1:choice;p.badgeNumber=freshBadge(room);
 p.isInspected=false;p.inspectTimer=0;
 // Silent invalidation: no public event links the retired and replacement disguises.
 if(room.activeInspection?.targetId===p.id)room.activeInspection=null;
}

export function roundSpawnAllocation(){
 const chosen=THIEF_SPAWN_CHOICES.map(group=>group[randomInt(group.length)]);
 const shuffle=<T>(values:T[])=>{for(let i=values.length-1;i>0;i--){const j=randomInt(i+1);[values[i],values[j]]=[values[j],values[i]];}return values;};
 return {thieves:shuffle(chosen.map(i=>({...PUBLIC_SPAWNS[i]}))),visitors:shuffle(PUBLIC_SPAWNS.filter((_,i)=>!chosen.includes(i)).map(p=>({...p})))};
}
