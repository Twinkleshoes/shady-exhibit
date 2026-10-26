import {modeConfig,changeMode} from './src/game/modes.js';
import {finishRoundRecord,returnToLobby} from './src/game/results.js';
import {markBriefingReady,failPreparation,isPreparing} from './src/game/preparation.js';
import {announceTour} from './src/game/tour.js';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import {Server} from 'socket.io';
import {createServer as createViteServer} from 'vite';
import type {GameRoom} from './src/types/game.js';
import {markSceneReady,admire,newRoom,newPlayer,startRound,stepRoom,lobby,clientState,note,inspect,selectCamera,panCamera,centerCamera,toggleObject,clearInteraction,releaseObject} from './src/game/engine.js';
import {generateRoomCode} from './src/game/rules.js';
if(process.argv.includes('--production'))process.env.NODE_ENV='production';
const app=express(),server=http.createServer(app),io=new Server(server);
const rooms=new Map<string,GameRoom>(),membership=new Map<string,string>();
const PORT=Number(process.env.PORT||3000);
const name=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim().slice(0,16):'Visitor';
function settleLobby(r:GameRoom){if(r.results&&r.resultViewers.every(id=>r.returnedToLobby.includes(id)))lobby(r);}
function broadcast(room:GameRoom){for(const p of Object.values(room.players))io.to(p.socketId).emit('state_update',clientState(room,p.id));}
function leave(id:string){
 const code=membership.get(id);membership.delete(id);if(!code)return;
 const room=rooms.get(code);if(!room)return;
 const interrupted=room.status==='playing'||isPreparing(room.status);
 const result=interrupted?finishRoundRecord(room,null,'A player left or disconnected. The round ended without a winner.',true):room.results;
 const p=room.players[id];if(p)releaseObject(room,p);
 room.resultViewers=room.resultViewers.filter(viewer=>viewer!==id);
 delete room.players[id];room.playerOrder=room.playerOrder.filter(p=>p!==id);
 if(!room.playerOrder.length){rooms.delete(code);return;}
 if(room.hostId===id)room.hostId=room.playerOrder[0];
 // Preserve the next guard relative to the surviving order.
 room.guardIndex=Math.min(room.guardIndex,room.playerOrder.length-1);
 if(interrupted){lobby(room);room.results=result;room.resultViewers=room.playerOrder.filter(id=>result?.players.some(p=>p.id===id));note(room,'A player left. Round interrupted without a winner.');}
 if(!interrupted)settleLobby(room);
 if(room.results){for(const entry of room.results.players)entry.departed=!room.players[entry.id];}
 broadcast(room);
}
let previous=performance.now();
setInterval(()=>{const now=performance.now(),dt=(now-previous)/1000;previous=now;for(const room of rooms.values())if(room.status==='playing'||isPreparing(room.status)){stepRoom(room,dt);broadcast(room);}},50);
io.on('connection',socket=>{
 const room=()=>rooms.get(membership.get(socket.id)||'');
 socket.on('create_room',(data={})=>{
  if(membership.has(socket.id))return;
  let code=generateRoomCode();while(rooms.has(code))code=generateRoomCode();
  const r=newRoom(code,socket.id);r.players[socket.id]=newPlayer(socket.id,name(data?.playerName));rooms.set(code,r);membership.set(socket.id,code);socket.join(code);
  socket.emit('room_joined',{roomCode:code,playerId:socket.id,isHost:true});broadcast(r);
 });
 socket.on('join_room',(data={})=>{
  if(membership.has(socket.id))return;
  const code=typeof data?.roomCode==='string'?data.roomCode.trim().toUpperCase():'';const r=rooms.get(code);
  const error=!r?'Room not found.':!['lobby','gameover'].includes(r.status)?'This round is already running.':r.playerOrder.length>=modeConfig(r.mode).players?'Room is full ('+modeConfig(r.mode).players+' players).':null;
  if(error){socket.emit('error_message',{message:error});return;}
  r!.players[socket.id]=newPlayer(socket.id,name(data?.playerName));r!.playerOrder.push(socket.id);membership.set(socket.id,code);socket.join(code);
  socket.emit('room_joined',{roomCode:code,playerId:socket.id,isHost:false});broadcast(r!);
 });
 socket.on('set_mode',(data={})=>{const r=room();if(!r)return;const error=changeMode(r,socket.id,data?.mode);if(error)socket.emit('error_message',{message:error});else broadcast(r);});
 for(const event of ['start_game','restart_game'])socket.on(event,()=>{
  const r=room();if(!r||r.hostId!==socket.id||!(event==='start_game'?['lobby','gameover'].includes(r.status):r.status==='gameover'||r.status==='lobby'&&!!r.results))return;
  if(!startRound(r,true)){socket.emit('error_message',{message:`Exactly ${modeConfig(r.mode).players} connected players are required.`});return;}broadcast(r);
 });
 socket.on('briefing_ready',(data={})=>{const r=room();if(r&&markBriefingReady(r,socket.id,data?.roundId))broadcast(r);});
 socket.on('scene_failed',(data={})=>{const r=room();if(r&&failPreparation(r,socket.id,data?.roundId))broadcast(r);});
 socket.on('scene_ready',(data={})=>{const r=room();if(r&&markSceneReady(r,socket.id,data?.roundId,data?.aspect))broadcast(r);});
 socket.on('player_move',(data={})=>{
  const r=room(),p=r?.players[socket.id];if(!r||r.status!=='playing'||p?.role!=='thief'||p.isCaptured)return;
  if(!Number.isFinite(data?.dx)||!Number.isFinite(data?.dy))return;
  p.input={dx:Math.max(-1,Math.min(1,data.dx)),dy:Math.max(-1,Math.min(1,data.dy)),at:Date.now()};
 });
 socket.on('announce_tour',()=>{const r=room();if(r&&r.status==='playing'&&r.players[socket.id]?.role==='guard'&&!r.tour.used){if(announceTour(r,socket.id))broadcast(r);else socket.emit('error_message',{message:'The tour meeting area is temporarily obstructed. Try the announcement again shortly.'});}});
 socket.on('admire',()=>{const r=room(),p=r?.players[socket.id];if(r&&p&&admire(r,p))broadcast(r);});
 socket.on('toggle_lamp',()=>{const r=room(),p=r?.players[socket.id];if(r&&p)toggleObject(r,p);});
 socket.on('start_theft',()=>{const r=room(),p=r?.players[socket.id];if(r?.status==='playing'&&p?.role==='thief'&&!p.isCaptured)p.isStealing=true;});
 socket.on('cancel_theft',()=>{const p=room()?.players[socket.id];if(p){p.isStealing=false;clearInteraction(p);}});
 socket.on('select_camera',(data={})=>{const r=room();if(r?.status==='playing'&&r.players[socket.id]?.role==='guard'){selectCamera(r,data?.cameraId,data?.aspect);broadcast(r);}});
 socket.on('pan_camera',(data={})=>{const r=room();if(r?.players[socket.id]?.role==='guard')panCamera(r,data?.cameraId,data?.direction);});
 socket.on('center_camera',(data={})=>{const r=room();if(r?.players[socket.id]?.role==='guard'){centerCamera(r,data?.cameraId);broadcast(r);}});
 socket.on('guard_inspect',(data={})=>{const r=room();if(r?.players[socket.id]?.role==='guard'){inspect(r,data?.targetBadgeNumber);broadcast(r);}});
 socket.on('return_to_lobby',()=>{const r=room();if(r&&returnToLobby(r,socket.id)){settleLobby(r);broadcast(r);}});
 for(const event of ['leave_room','leave_game'])socket.on(event,()=>{const code=membership.get(socket.id);if(code)socket.leave(code);leave(socket.id);socket.emit('left_room_confirmed');});
 socket.on('disconnect',()=>leave(socket.id));
});
app.get('/health',(_q,r)=>r.json({status:'ok'}));
async function start(){
 if(process.env.NODE_ENV==='production'){
  app.use(express.static(path.resolve(import.meta.dirname,'dist')));
  app.get('*',(_q,r)=>r.sendFile(path.resolve(import.meta.dirname,'dist/index.html')));
 }else{const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
 server.listen(PORT,'0.0.0.0',()=>console.log(`Server listening on http://0.0.0.0:${PORT}`));
}
start().catch(e=>{console.error(e);process.exit(1);});
