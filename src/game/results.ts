import {modeConfig,activeTreasures,type ModeId} from './modes.js';
import type {GameRoom,Role} from '../types/game.js';
export interface PlayerRoundRecord {id:string;name:string;role:Role;treasures:number;captures:number;innocentInspections:number;rescues:number}
export interface RoundResults {
 automaticReleases:number;mode:ModeId;roundId:string;winner:'thieves'|'guard'|null;interrupted:boolean;reason:string;duration:number;
 treasures:{id:string;name:string;stolen:boolean}[];
 players:(PlayerRoundRecord&{status:'escaped'|'captured'|'in-museum'|null;departed:boolean})[];
 totals:{captures:number;innocentInspections:number;rescues:number};
}
export function beginRoundRecords(room:GameRoom){
 room.results=null;room.returnedToLobby=[];room.resultViewers=[...room.playerOrder];
 room.roundRecords=Object.fromEntries(Object.values(room.players).filter(p=>p.role).map(p=>[p.id,{id:p.id,name:p.name,role:p.role!,treasures:0,captures:0,innocentInspections:0,rescues:0}]));
}
export function recordRoundEvent(room:GameRoom,id:string,kind:'treasures'|'captures'|'innocentInspections'|'rescues'){
 if(room.status!=='playing'||room.results)return;
 const record=room.roundRecords[id];if(record)record[kind]++;
}
export function recordGuardEvent(room:GameRoom,kind:'captures'|'innocentInspections'){
 const guard=Object.values(room.players).find(p=>p.role==='guard');if(guard)recordRoundEvent(room,guard.id,kind);
}
/** Immutable end snapshot, recorded before lobby resets or departure removes a participant. */
export function finishRoundRecord(room:GameRoom,winner:RoundResults['winner'],reason:string,interrupted=false){
 if(room.results)return room.results;
 const players=Object.values(room.roundRecords).map(record=>{const p=room.players[record.id];return {...record,status:record.role==='guard'?null:p?.isCaptured?'captured' as const:!interrupted&&winner==='thieves'?'escaped' as const:'in-museum' as const,departed:!p};});
 room.results={automaticReleases:room.automaticReleaseUsed.length,mode:room.mode,roundId:room.roundId,winner:interrupted?null:winner,interrupted,reason,duration:Math.min(modeConfig(room.mode).seconds,Math.max(0,modeConfig(room.mode).seconds-room.roundTimeLeft)),treasures:activeTreasures(room.treasures).map(t=>({id:t.id,name:t.name,stolen:t.stolen})),players,totals:{captures:players.reduce((n,p)=>n+p.captures,0),innocentInspections:players.reduce((n,p)=>n+p.innocentInspections,0),rescues:players.reduce((n,p)=>n+p.rescues,0)}};
 return room.results;
}
export function resultsFor(room:GameRoom,id:string){return ['lobby','gameover'].includes(room.status)&&room.resultViewers.includes(id)&&room.results?.players.some(p=>p.id===id)?room.results:null;}
export function returnToLobby(room:GameRoom,id:string){
 if(!room.players[id]||!resultsFor(room,id))return false;
 if(!room.returnedToLobby.includes(id))room.returnedToLobby.push(id);return true;
}
export function viewingResults(room:GameRoom,id:string){return !!resultsFor(room,id)&&!room.returnedToLobby.includes(id);}
