import {modeConfig} from './modes.js';
import type {GameRoom} from '../types/game.js';
export const LOADING_TIMEOUT_MS=120000,COUNTDOWN_MS=3000;
export const isPreparing=(status:string)=>['loading','briefing','countdown'].includes(status);
export function clearPreparationInputs(room:GameRoom){
 for(const p of Object.values(room.players)){p.input={dx:0,dy:0,at:0};p.isStealing=false;p.theftProgress=0;p.interactionTargetId=null;p.isInspected=false;}
 room.cameraPanInput={cameraId:room.cameraId,direction:0,at:0};room.activeInspection=null;
}
export function markBriefingReady(room:GameRoom,id:string,roundId:string,now=Date.now()){
 if(room.status!=='briefing'||room.roundId!==roundId||!room.players[id]||room.preparationError||room.readyPlayerIds.length!==modeConfig(room.mode).players||room.briefingReadyIds.includes(id))return false;
 room.briefingReadyIds.push(id);clearPreparationInputs(room);
 if(room.playerOrder.every(p=>room.briefingReadyIds.includes(p))){room.status='countdown';room.countdownEndsAt=now+COUNTDOWN_MS;}
 return true;
}
export function failPreparation(room:GameRoom,id:string,roundId:string){
 if(!isPreparing(room.status)||room.roundId!==roundId||!room.players[id]||room.preparationError)return false;
 room.status='loading';room.preparationError='A museum view could not be prepared. Leave to return the party to the lobby, then try again.';room.readyPlayerIds=room.readyPlayerIds.filter(p=>p!==id);room.briefingReadyIds=[];room.countdownEndsAt=null;clearPreparationInputs(room);return true;
}
export function tickPreparation(room:GameRoom,now=Date.now()){
 if(room.status==='loading'&&!room.preparationError&&room.loadingDeadline!==null&&now>=room.loadingDeadline){room.preparationError='Museum preparation timed out. Leave to return the party to the lobby, then check your connection or graphics support.';clearPreparationInputs(room);}
 if(room.status==='countdown'&&room.countdownEndsAt!==null&&now>=room.countdownEndsAt){
  room.gameStartedAt=room.countdownEndsAt;room.status='playing';room.roundTimeLeft=Math.max(0,modeConfig(room.mode).seconds-(now-room.gameStartedAt)/1000);room.elapsed=(now-room.gameStartedAt)/1000;clearPreparationInputs(room);
 }
}
export function preparationState(room:GameRoom,id:string,now=Date.now()){
 return {sceneReady:room.readyPlayerIds.includes(id),briefingReady:room.briefingReadyIds.includes(id),briefingReadyCount:room.briefingReadyIds.length,countdownRemaining:room.status==='countdown'&&room.countdownEndsAt!==null?Math.max(0,Math.ceil((room.countdownEndsAt-now)/1000)):0,startsAt:room.countdownEndsAt,serverNow:now,error:room.preparationError};
}
