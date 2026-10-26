import {findRoute} from './navigation.js';
import {modeConfig,activeTreasures,clearModeState} from './modes.js';
import {beginRoundRecords,recordRoundEvent,recordGuardEvent,finishRoundRecord,resultsFor,viewingResults} from './results.js';
import {LOADING_TIMEOUT_MS,clearPreparationInputs,tickPreparation,preparationState} from './preparation.js';
import {emptyTour,publicTour,tickTour,tourVisitor,cancelTour} from './tour.js';
import {stepCarriedObject,availableObjects} from './lamp-carry.js';
import {WALK_SPEED,INPUT_TIMEOUT_MS,CAMERA_PAN_SPEED} from './settings.js';
import {freshBadge,replaceDisguise,roundSpawnAllocation} from './identity.js';
import {APPEARANCES} from './appearances.js';
import {walkVisitor,faceExhibit} from './visitors.js';
import {randomBytes,randomInt} from 'node:crypto';
import type {ClientGameState,GameRoom,ServerPlayer,Vector2D} from '../types/game.js';
import {calculateShadow,isShadowTouchingTreasure,resolveWallCollisions,selectLamp,PLAYER_RADIUS} from './physics.js';
import {assignRoles,rotateGuardRoles,tickInspectionCharges} from './rules.js';
import {CAMERAS,visibleOnCamera,visibleVisitorOnCamera,clampPan} from './cameras.js';
import {defaultLamps,defaultTreasures,defaultMovables,defaultSwitches,defaultWalls,movableWalls,SPAWNS,ESCAPE,HOLDING,inside,roomName,RELEASE_SPAWNS} from './world.js';
export const emptyShadow=()=>({active:false,dirX:0,dirY:0,length:0,handX:0,handY:0,angle:0});
export function newPlayer(id:string,name:string,pos:Vector2D=SPAWNS[0]):ServerPlayer {
 return {id,socketId:id,name,badgeNumber:0,role:null,...pos,isCaptured:false,isInspected:false,inspectTimer:0,isStealing:false,theftProgress:0,shadow:emptyShadow(),shadowKey:randomBytes(12).toString('base64url'),activeLampId:null,interactionTargetId:null,carryingId:null,carryBlocked:false,appearanceId:randomInt(APPEARANCES.length),action:'idle',admireUntil:0,walkSpeed:0,heading:0,input:{dx:0,dy:0,at:0}};
}
export function newRoom(code:string,hostId:string):GameRoom {
 const config=modeConfig();
 const lamps=defaultLamps(),treasures=defaultTreasures(),movables=defaultMovables(),staticWalls=defaultWalls();
 return {mode:'standard',captureCounts:{},pendingReleases:{},automaticReleaseUsed:[],resultViewers:[],roundRecords:{},results:null,returnedToLobby:[],tour:emptyTour(),code,roundId:'',readyPlayerIds:[],briefingReadyIds:[],loadingDeadline:null,countdownEndsAt:null,gameStartedAt:null,preparationError:null,usedBadges:[],hostId,playerOrder:[hostId],guardIndex:-1,status:'lobby',players:{},visitors:[],staticWalls,walls:[...staticWalls,...movableWalls(movables)],lamps,lamp:lamps[0],treasures,treasure:treasures[0],switches:defaultSwitches(),movables,roundTimeLeft:config.seconds,elapsed:0,cameraId:'cam_01',cameraAspect:1.5,cameraPans:Object.fromEntries(CAMERAS.map(c=>[c.id,0])),cameraPanInput:{cameraId:'cam_01',direction:0,at:0},disabledCameras:{},theftProgress:0,theftThiefId:null,guardCharges:config.charges,guardRechargeTimers:[],activeInspection:null,alerts:[],winner:null,winReason:null};
}
export function note(room:GameRoom,message:string) {room.alerts.push(message);room.alerts=room.alerts.slice(-12);}
export function clearInteraction(p:ServerPlayer) {p.theftProgress=0;p.interactionTargetId=null;}
export function releaseObject(room:GameRoom,p:ServerPlayer) {
 for(const item of [...room.lamps,...room.movables]) if(item.holderId===p.id)item.holderId=null;
 p.carryingId=null;p.carryBlocked=false;
}
export function startRound(room:GameRoom,waitForClients=false,now=Date.now()) {
 const config=modeConfig(room.mode);
 if(room.playerOrder.length!==config.players)return false;
 const roles=room.guardIndex<0?assignRoles(room.playerOrder):rotateGuardRoles(room.playerOrder,room.guardIndex).roles;
 room.guardIndex=room.playerOrder.findIndex(id=>roles[id]==='guard');
 const reset=newRoom(room.code,room.hostId);
 Object.assign(room,{captureCounts:{},pendingReleases:{},automaticReleaseUsed:[],tour:emptyTour(),roundId:randomBytes(12).toString('base64url'),readyPlayerIds:[],briefingReadyIds:[],loadingDeadline:null,countdownEndsAt:null,gameStartedAt:null,preparationError:null,usedBadges:[],staticWalls:reset.staticWalls,walls:reset.walls,lamps:reset.lamps,lamp:reset.lamp,treasures:reset.treasures.map(t=>config.treasureIds.includes(t.id)?t:Object.assign(t,{active:false})),treasure:reset.treasure,movables:reset.movables,switches:reset.switches.filter(s=>s.kind!=='rescue'||config.teammateRescue),roundTimeLeft:config.seconds,elapsed:0,cameraId:'cam_01',cameraAspect:1.5,cameraPans:Object.fromEntries(CAMERAS.map(c=>[c.id,0])),cameraPanInput:{cameraId:'cam_01',direction:0,at:0},disabledCameras:{},guardCharges:config.charges,guardRechargeTimers:[],activeInspection:null,theftProgress:0,theftThiefId:null,winner:null,winReason:null,alerts:[config.seconds===360?'Six-minute shift started. Protect all three galleries.':'Four-minute Duel started. Protect the Sapphire and Bronze Sun.']});
 const allocation=roundSpawnAllocation(),spawns=allocation.thieves;
 let index=0;
 for(const id of room.playerOrder) {
  const p=room.players[id],pos=roles[id]==='thief'?spawns[index++]:{x:-999,y:-999};
  Object.assign(p,newPlayer(id,p.name,pos),{role:roles[id],badgeNumber:freshBadge(room)});
 }
 room.visitors=Array.from({length:9},(_,i)=>{
  return {...newPlayer(randomBytes(15).toString('base64url'),'Visitor',allocation.visitors[i]),badgeNumber:freshBadge(room)};
 });
 const pool=Array.from({length:APPEARANCES.length},(_,i)=>i);for(let i=pool.length-1;i>0;i--){const j=randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
 [...Object.values(room.players).filter(p=>p.role!=='guard'),...room.visitors].forEach((p,i)=>p.appearanceId=pool[i%pool.length]);
 beginRoundRecords(room);
 room.status=waitForClients?'loading':'playing';room.loadingDeadline=waitForClients?now+LOADING_TIMEOUT_MS:null;clearPreparationInputs(room);refreshShadows(room);return true;
}
export function markSceneReady(room:GameRoom,id:string,roundId:string,aspect=1.5){
 if(room.status!=='loading'||room.preparationError||room.roundId!==roundId||!room.players[id]||room.readyPlayerIds.includes(id))return false;
 if(room.players[id].role==='guard')room.cameraAspect=Number.isFinite(aspect)?Math.max(.5,Math.min(3,aspect)):1.5;
 if(!room.readyPlayerIds.includes(id))room.readyPlayerIds.push(id);
 if(room.playerOrder.every(id=>room.readyPlayerIds.includes(id))){room.status='briefing';room.loadingDeadline=null;clearPreparationInputs(room);}
 return true;
}
export function lobby(room:GameRoom) {
 room.captureCounts={};room.pendingReleases={};room.automaticReleaseUsed=[];
 room.results=null;room.roundRecords={};room.returnedToLobby=[];room.resultViewers=[];
 cancelTour(room);room.tour=emptyTour();
 room.roundId='';room.readyPlayerIds=[];room.briefingReadyIds=[];room.loadingDeadline=null;room.countdownEndsAt=null;room.gameStartedAt=null;room.preparationError=null;room.usedBadges=[];room.status='lobby';room.winner=null;room.winReason=null;room.activeInspection=null;room.theftProgress=0;room.theftThiefId=null;
 room.cameraPans=Object.fromEntries(CAMERAS.map(c=>[c.id,0]));room.cameraPanInput={cameraId:'cam_01',direction:0,at:0};
 room.visitors=[];room.disabledCameras={};room.guardRechargeTimers=[];room.roundTimeLeft=modeConfig(room.mode).seconds;
 for(const p of Object.values(room.players)) {releaseObject(room,p);p.role=null;p.action='idle';p.admireUntil=0;p.isCaptured=false;p.isInspected=false;p.isStealing=false;p.input={dx:0,dy:0,at:0};clearInteraction(p);}
}
export function sees(room:GameRoom,pos:Vector2D) {return !(room.disabledCameras[room.cameraId]>0)&&visibleVisitorOnCamera(pos,room.cameraId,room.walls,room.cameraAspect,room.cameraPans[room.cameraId]||0);}
export function cancelInspection(room:GameRoom,reason:string) {
 if(!room.activeInspection)return;
 const p=[...Object.values(room.players),...room.visitors].find(p=>p.id===room.activeInspection!.targetId);
 if(p)p.isInspected=false;room.activeInspection=null;note(room,`Inspection cancelled: ${reason}. Charge spent.`);
}
export function selectCamera(room:GameRoom,id:string,aspect:number) {
 if(!CAMERAS.some(c=>c.id===id))return;
 if(room.cameraId!==id)cancelInspection(room,'feed changed');
 room.cameraPanInput={cameraId:id,direction:0,at:0};
 room.cameraId=id;room.cameraAspect=Number.isFinite(aspect)?Math.max(.5,Math.min(3,aspect)):1.5;
}
export function panCamera(room:GameRoom,id:string,direction:number,now=Date.now()) {
 if(room.status!=='playing'||id!==room.cameraId||!Number.isFinite(direction))return;
 if(room.disabledCameras[id]>0&&direction!==0)return;
 room.cameraPanInput={cameraId:id,direction:Math.sign(direction),at:now};
}
export function centerCamera(room:GameRoom,id:string) {
 if(room.status!=='playing'||id!==room.cameraId||room.disabledCameras[id]>0)return;
 room.cameraPans[id]=0;room.cameraPanInput={cameraId:id,direction:0,at:0};
 if(room.activeInspection){const p=[...Object.values(room.players),...room.visitors].find(p=>p.id===room.activeInspection!.targetId);if(!p||!sees(room,p))cancelInspection(room,'panned away');}
}
export function inspect(room:GameRoom,badge:number) {
 if(room.status!=='playing'||room.guardCharges<=0||room.activeInspection)return false;
 const p=[...Object.values(room.players),...room.visitors].find(p=>p.badgeNumber===badge&&p.role!=='guard');
 if(!p||p.isCaptured||!sees(room,p))return false;
 room.guardCharges--;room.guardRechargeTimers.push(modeConfig(room.mode).rechargeSeconds);p.isInspected=true;
 room.activeInspection={targetId:p.id,elapsed:0};return true;
}
export function toggleObject(room:GameRoom,p:ServerPlayer) {
 if(room.status!=='playing'||p.role!=='thief'||p.isCaptured)return;
 if(p.carryingId){releaseObject(room,p);return;}
 const c=availableObjects(p,room.lamps,room.movables,room.walls)[0];
 if(c){c.item.holderId=p.id;p.carryingId=c.id;p.carryBlocked=false;p.heading=Math.atan2(c.pos.x-p.x,c.pos.y-p.y);}

}
export function refreshShadows(room:GameRoom) {
 room.walls=[...room.staticWalls,...movableWalls(room.movables)];
 for(const p of Object.values(room.players)) {
  const lamp=p.role==='thief'&&!p.isCaptured?selectLamp(p,room.lamps,room.walls,p.activeLampId):null;
  p.activeLampId=lamp?.id||null;p.shadow=lamp?calculateShadow(p,lamp,room.walls):emptyShadow();
 }
}
export function targetFor(room:GameRoom,p:ServerPlayer) {
 if(p.isCaptured||p.role!=='thief')return null;
 const targets=[...activeTreasures(room.treasures).filter(t=>!t.stolen),...room.switches.filter(s=>s.cooldown<=0&&(s.kind!=='rescue'||modeConfig(room.mode).teammateRescue&&Object.values(room.players).some(p=>p.role==='thief'&&p.isCaptured)))];
 const candidates=targets.filter(t=>isShadowTouchingTreasure(p.shadow,t as any));
 return candidates.sort((a,b)=>Math.hypot(a.x-p.shadow.handX,a.y-p.shadow.handY)-Math.hypot(b.x-p.shadow.handX,b.y-p.shadow.handY))[0]||null;
}
export function capture(room:GameRoom,p:ServerPlayer) {
 if(room.status!=='playing'||p.role!=='thief'||p.isCaptured)return;
 room.captureCounts[p.id]=(room.captureCounts[p.id]||0)+1;
 const config=modeConfig(room.mode);
 if(config.automaticReleases>room.automaticReleaseUsed.filter(id=>id===p.id).length&&room.captureCounts[p.id]<config.capturesToWin)room.pendingReleases[p.id]=room.elapsed+config.detentionSeconds;
 recordGuardEvent(room,'captures');
 p.action='captured';p.admireUntil=0;p.walkSpeed=0;p.isCaptured=true;p.isInspected=false;p.isStealing=false;p.input={dx:0,dy:0,at:0};releaseObject(room,p);clearInteraction(p);
 const i=room.playerOrder.filter(id=>room.players[id].role==='thief').indexOf(p.id);
 p.x=HOLDING.x+35+i*40;p.y=HOLDING.y+60;p.shadow=emptyShadow();
 note(room,`Badge #${p.badgeNumber} detained in Security Holding.`);
}
export function releaseVisitor(room:GameRoom,p:ServerPlayer,pos:Vector2D){
 replaceDisguise(room,p);p.shadowKey=randomBytes(12).toString('base64url');p.shadow=emptyShadow();p.activeLampId=null;p.walkSpeed=0;p.isCaptured=false;p.action='idle';p.admireUntil=0;p.x=pos.x;p.y=pos.y;p.input={dx:0,dy:0,at:0};p.isStealing=false;clearInteraction(p);
}
export function tickAutomaticRelease(room:GameRoom){
 if(room.status!=='playing'||room.roundTimeLeft<=0)return;
 for(const [id,deadline]of Object.entries(room.pendingReleases)){
  if(room.elapsed+1e-8<deadline)continue;
  const p=room.players[id];if(!p||!p.isCaptured||room.automaticReleaseUsed.includes(id)){delete room.pendingReleases[id];continue;}
  // Existing opaque privacy corridor; test every allowed camera angle before teleporting.
  const candidates=[...RELEASE_SPAWNS.flatMap(s=>[{...s},...[-12,12].map(dx=>({x:s.x+dx,y:s.y}))]),...[670,700,730,760,780,800,830,860,890,910].flatMap(x=>[1000,1020,1045,1085,1135,1160,1190].map(y=>({x,y})))];
  const pos=candidates.find(pos=>{const safe=resolveWallCollisions(pos,PLAYER_RADIUS,room.walls);return !inside(pos,ESCAPE)&&!inside(pos,HOLDING)&&Math.hypot(safe.x-pos.x,safe.y-pos.y)<.01&&findRoute(pos,{x:850,y:1120},room.walls).length>0&&CAMERAS.every(c=>Array.from({length:101},(_,i)=>(i-50)*Math.PI/180).every(pan=>!visibleVisitorOnCamera(pos,c.id,room.walls,3,pan)));});
  // If movable furniture obstructs the exit, remain concealed and retry next server tick.
  if(!pos)continue;
  delete room.pendingReleases[id];room.automaticReleaseUsed.push(id);releaseVisitor(room,p,pos);
  note(room,'HOLDING ALERT · Automatic release completed. Replacement identity and location are confidential.');
 }
}
export function evaluateFinal(room:GameRoom) {
 const thieves=Object.values(room.players).filter(p=>p.role==='thief');const free=thieves.filter(p=>!p.isCaptured);
 const config=modeConfig(room.mode);
 if(config.captureRule==='two-strikes'&&thieves.some(p=>(room.captureCounts[p.id]||0)>=config.capturesToWin))return {winner:'guard' as const,reason:'The thief was captured a second time.'};
 if(config.captureRule==='all-captured'&&thieves.length&&free.length===0)return {winner:'guard' as const,reason:'All thieves captured.'};
 if(room.roundTimeLeft<=0)return {winner:'guard' as const,reason:config.thieves===1?'Time expired before the thief escaped.':'Time expired before the thieves escaped.'};
 if(activeTreasures(room.treasures).every(t=>t.stolen)&&free.length>0&&free.every(p=>inside(p,ESCAPE)))return {winner:'thieves' as const,reason:config.teammateRescue?`All three treasures stolen and the free thieves escaped.${thieves.length>free.length?` ${thieves.length-free.length} left in holding.`:''}`:'Both active treasures stolen and the thief escaped.'};
 return null;
}
export function stepRoom(room:GameRoom,dt:number,now=Date.now()) {
 if(room.status!=='playing'){tickPreparation(room,now);return;}
 room.elapsed+=dt;room.roundTimeLeft=Math.max(0,room.roundTimeLeft-dt);
 for(const id of Object.keys(room.disabledCameras))room.disabledCameras[id]=Math.max(0,room.disabledCameras[id]-dt);
 for(const sw of room.switches)sw.cooldown=Math.max(0,sw.cooldown-dt);
 const recharge=tickInspectionCharges(room.guardCharges,room.guardRechargeTimers,dt,modeConfig(room.mode).charges);room.guardCharges=recharge.charges;room.guardRechargeTimers=recharge.timers;
 const moveDt=Math.min(dt,.1);
 const pan=room.cameraPanInput;
 if(pan.cameraId===room.cameraId&&now-pan.at<=INPUT_TIMEOUT_MS&&!(room.disabledCameras[room.cameraId]>0))room.cameraPans[room.cameraId]=clampPan((room.cameraPans[room.cameraId]||0)+pan.direction*CAMERA_PAN_SPEED*moveDt);
 for(const p of Object.values(room.players)) {
  p.walkSpeed=0;p.action=p.isCaptured?'captured':'idle';
  const moving=now-p.input.at<=INPUT_TIMEOUT_MS&&Math.hypot(p.input.dx,p.input.dy)>0;
  if(moving||p.isStealing||p.carryingId)p.admireUntil=0;
  if(p.role==='thief'&&!p.isCaptured&&p.admireUntil>room.elapsed){p.action='admire';faceExhibit(p,moveDt,room.walls);}
  if(p.role!=='thief'||p.isCaptured||now-p.input.at>INPUT_TIMEOUT_MS)continue;
  const norm=Math.hypot(p.input.dx,p.input.dy);if(!norm)continue;
  const pos=resolveWallCollisions({x:p.x+p.input.dx/norm*WALK_SPEED*moveDt,y:p.y+p.input.dy/norm*WALK_SPEED*moveDt},PLAYER_RADIUS,room.walls);p.heading=Math.atan2(p.input.dx,p.input.dy);p.walkSpeed=moveDt>0?Math.min(WALK_SPEED,Math.hypot(pos.x-p.x,pos.y-p.y)/moveDt):0;p.x=pos.x;p.y=pos.y;if(p.walkSpeed>1)p.action='walk';
 }
 tickTour(room,dt);
 for(const [i,p] of room.visitors.entries())if(!tourVisitor(room,p,moveDt))walkVisitor(p,i,moveDt,room.walls);
 // Authoritative bounded carry motion. Camera orbit is never an input to this system.
 for(const item of [...room.lamps,...room.movables]) {
  if(!item.holderId)continue;
  const holder=room.players[item.holderId];
  if(!holder){item.holderId=null;continue;}
  if(holder.isCaptured){releaseObject(room,holder);continue;}
  const result=stepCarriedObject(item,holder,room.walls,room.lamps,moveDt);
  holder.carryBlocked=result.blocked;
  if(result.release)releaseObject(room,holder);
 }

 room.walls=[...room.staticWalls,...movableWalls(room.movables)];
 for(const p of [...Object.values(room.players),...room.visitors])if(p.role!=='guard'&&!p.isCaptured){const safe=resolveWallCollisions(p,PLAYER_RADIUS,room.walls);p.x=safe.x;p.y=safe.y;}
 refreshShadows(room);
 if(room.activeInspection) {
  const p=[...Object.values(room.players),...room.visitors].find(p=>p.id===room.activeInspection!.targetId);
  if(!p||p.isCaptured||!sees(room,p))cancelInspection(room,'target hidden or camera disabled');
  else {p.isInspected=true;room.activeInspection.elapsed+=dt;if(room.activeInspection.elapsed>=2){p.isInspected=false;room.activeInspection=null;if(p.role==='thief')capture(room,p);else {recordGuardEvent(room,'innocentInspections');note(room,`Badge #${p.badgeNumber} cleared: museum visitor.`);}}}
 }
 tickAutomaticRelease(room);
 const guardOutcome=evaluateFinal(room);
 if(guardOutcome?.winner==='guard'){finishRoundRecord(room,guardOutcome.winner,guardOutcome.reason);clearModeState(room);clearPreparationInputs(room);for(const p of Object.values(room.players))releaseObject(room,p);cancelTour(room);room.status='gameover';room.winner=guardOutcome.winner;room.winReason=guardOutcome.reason;return;}
 for(const p of Object.values(room.players)) {
  const target=p.isStealing?targetFor(room,p):null;
  if(!target){clearInteraction(p);continue;}
  if(p.interactionTargetId!==target.id){clearInteraction(p);p.interactionTargetId=target.id;}
  p.theftProgress+=dt;
  if(p.theftProgress+1e-8<3)continue;
  if('stolen' in target){target.stolen=true;recordRoundEvent(room,p.id,'treasures');note(room,`THEFT ALERT · ${target.room}: ${target.name} missing.`);}
  else if(target.kind==='rescue') {
   recordRoundEvent(room,p.id,'rescues');
   for(const [i,other] of Object.values(room.players).filter(p=>p.isCaptured).entries()){
    releaseVisitor(room,other,RELEASE_SPAWNS[i]);
   }
   note(room,'HOLDING ALERT · Security holding release activated.');
  } else {
   room.disabledCameras[target.cameraId!]=5;target.cooldown=30;
   note(room,`CAMERA ALERT · ${target.name}: feed offline for five seconds.`);
   if(room.cameraId===target.cameraId)cancelInspection(room,'camera disrupted');
  }
  clearInteraction(p);p.isStealing=false;
 }
 refreshShadows(room);
 const outcome=evaluateFinal(room);if(outcome){finishRoundRecord(room,outcome.winner,outcome.reason);clearModeState(room);clearPreparationInputs(room);for(const p of Object.values(room.players))releaseObject(room,p);cancelTour(room);room.status='gameover';room.winner=outcome.winner;room.winReason=outcome.reason;}
}
export function clientState(room:GameRoom,id:string):ClientGameState {
 const me=room.players[id],guard=me.role==='guard';
 const players=[...Object.values(room.players).filter(p=>p.role!=='guard'),...(room.status==='gameover'?[]:room.visitors)].filter(p=>!guard||room.status==='gameover'||sees(room,p)).map(p=>({
  id:guard?`badge_${p.badgeNumber}`:p.id,name:guard?`Suspect #${p.badgeNumber}`:p.name,badgeNumber:p.badgeNumber,x:p.x,y:p.y,isCaptured:p.isCaptured,isInspected:p.isInspected,
  shadow:guard&&!p.isStealing?{active:true,dirX:.6,dirY:.8,length:30,handX:p.x+18,handY:p.y+24,angle:.93}:p.shadow,
  appearanceId:p.appearanceId,action:p.action,walkSpeed:p.walkSpeed,heading:p.heading,isSelf:p.id===id,isTeammate:!guard&&p.role==='thief'&&p.id!==id,isReaching:p.isStealing,visibleOnFeed:!guard||sees(room,p),
  activeLampId:guard?null:p.activeLampId,interactionTargetId:guard?null:p.interactionTargetId,interactionProgress:guard?0:Math.min(1,p.theftProgress/3),carryingId:guard?null:p.carryingId,carryBlocked:p.id===id?p.carryBlocked:false,
 }));
 const target=room.activeInspection&&[...Object.values(room.players),...room.visitors].find(p=>p.id===room.activeInspection!.targetId);
 return {mode:room.mode,canChangeMode:room.status==='lobby'&&(!room.results||room.resultViewers.every(id=>room.returnedToLobby.includes(id))),duel:modeConfig(room.mode).captureRule==='two-strikes'?{captures:room.status==='gameover'?(room.results?.totals.captures||0):Math.max(0,...Object.values(room.captureCounts)),detentionRemaining:guard?0:Math.max(0,(room.pendingReleases[id]??room.elapsed)-room.elapsed),releaseUsed:room.status==='gameover'?!!room.results?.automaticReleases:guard?room.automaticReleaseUsed.length>0:room.automaticReleaseUsed.includes(id)}:null,results:resultsFor(room,id),viewingResults:viewingResults(room,id),connectedPlayerCount:room.playerOrder.length,preparation:preparationState(room,id),tour:publicTour(room.tour),roomCode:room.code,roundId:room.roundId,readyCount:room.readyPlayerIds.length,status:room.status==='gameover'&&room.results&&(!viewingResults(room,id))?'lobby':room.status,myId:id,myRole:me.role,isHost:room.hostId===id,players,walls:room.walls,
  lamps:room.lamps.map(l=>({...l,holderId:guard?null:l.holderId})),lamp:room.lamps.find(l=>l.id===me.activeLampId)||room.lamps[0],treasures:room.treasures,treasure:activeTreasures(room.treasures).find(t=>!t.stolen)||room.treasures[0],switches:room.switches,movables:room.movables.map(m=>({...m,holderId:guard?null:m.holderId})),roundTimeLeft:room.roundTimeLeft,
  visibleShadows:guard&&!(room.disabledCameras[room.cameraId]>0)?Object.values(room.players).filter(p=>p.role==='thief'&&p.isStealing&&p.shadow.active&&Array.from({length:11},(_,i)=>i/10).some(t=>visibleOnCamera({x:p.x+(p.shadow.handX-p.x)*t,y:p.y+(p.shadow.handY-p.y)*t},room.cameraId,room.walls,room.cameraAspect,.025,room.cameraPans[room.cameraId]||0))).map(p=>({id:p.shadowKey,x:p.x,y:p.y,shadow:p.shadow})):[],
  theft:{inProgress:!guard&&me.theftProgress>0,progress:guard?0:Math.min(1,me.theftProgress/3),thiefBadge:guard?null:me.badgeNumber},
  guard:{activeCameraId:room.cameraId,cameraPans:room.cameraPans,disabledCameras:room.disabledCameras,charges:room.guardCharges,maxCharges:modeConfig(room.mode).charges,rechargingTimeLeft:room.guardRechargeTimers,inspecting:target?{targetBadge:target.badgeNumber,progress:Math.min(1,room.activeInspection!.elapsed/2)}:null,recentAlerts:room.alerts.slice(-6),isCameraLive:room.status==='playing'&&!(room.disabledCameras[room.cameraId]>0)},
  winner:room.winner,winReason:room.winReason,lobbyPlayers:guard&&!['lobby','gameover'].includes(room.status)?[]:room.playerOrder.map(id=>({id,name:room.players[id].name,isHost:room.hostId===id})),
 };
}

export function admire(room:GameRoom,p:ServerPlayer){
 if(room.status!=='playing'||p.role!=='thief'||p.isCaptured||p.carryingId)return false;
 p.isStealing=false;clearInteraction(p);p.input={dx:0,dy:0,at:0};p.admireUntil=p.admireUntil>room.elapsed?0:room.elapsed+4;p.action=p.admireUntil?'admire':'idle';return true;
}
