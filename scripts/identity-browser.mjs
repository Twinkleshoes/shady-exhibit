import {prepareMatch} from './prepare-match.mjs';
import {chromium} from 'playwright';import * as THREE from 'three';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {findRoute,clearPath} from '../src/game/navigation.ts';import {selectLamp,calculateShadow,isShadowTouchingTreasure,resolveWallCollisions} from '../src/game/physics.ts';import {CAMERAS,cameraIsLive,cameraTarget} from '../src/game/cameras.ts';
const out='test-artifacts/identity';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const pages=[],errors=[],yaws=new Map(),state=p=>p.evaluate(()=>window.gameState),self=p=>p.evaluate(()=>window.gameState.players.find(p=>p.isSelf));
async function wait(p,fn,arg,timeout=10000){return p.waitForFunction(fn,arg,{timeout});}
async function orbit(p,angle){let delta=Math.atan2(Math.sin(yaws.get(p)-angle),Math.cos(yaws.get(p)-angle))/.007;while(Math.abs(delta)>.01){const part=Math.max(-220,Math.min(220,delta));await p.mouse.move(950,650);await p.mouse.down();await p.mouse.move(950+part,650,{steps:4});await p.mouse.up();delta-=part;}yaws.set(p,angle);}
function orthogonal(a,b,walls,depth=0){
 const x={x:b.x,y:a.y},y={x:a.x,y:b.y};
 if(clearPath(a,x,walls)&&clearPath(x,b,walls))return [x,b];
 if(clearPath(a,y,walls)&&clearPath(y,b,walls))return [y,b];
 assert(depth<12,'orthogonal decomposition');const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};return [...orthogonal(a,mid,walls,depth+1),...orthogonal(mid,b,walls,depth+1)];
}
async function move(p,target){
 await p.bringToFront();const s=await state(p);if(s.status!=='playing')return;const start=await self(p),route=findRoute(start,target,s.walls);assert(route.length,'route '+JSON.stringify(target));
 await orbit(p,0);let from=start,points=[];for(const point of route){points.push(...orthogonal(from,point,s.walls));from=point;}
 // Hold actual camera-relative WASD along validated rectilinear legs. No position injection.
 for(const point of points)for(const dimension of ['x','y']){
  let current=await self(p),delta=point[dimension]-current[dimension];if(Math.abs(delta)<6)continue;const key=dimension==='x'?(delta>0?'d':'a'):(delta>0?'s':'w');const begin=Date.now();await p.keyboard.down(key);
  try{while(Date.now()-begin<30000){await p.waitForTimeout(50);if((await state(p)).status!=='playing')return;current=await self(p);delta=point[dimension]-current[dimension];if(Math.abs(delta)<7)break;}
   assert(Math.abs(delta)<7,'keyboard leg blocked '+JSON.stringify({point,dimension,me:current}));
  }finally{await p.keyboard.up(key);}await p.waitForTimeout(100);
  // Record the yaw actually used by this movement for the next orbit command.
  const measured=(await self(p)).heading,offset=key==='w'?Math.PI:key==='d'?-Math.PI/2:key==='a'?Math.PI/2:0;
  yaws.set(p,Math.atan2(Math.sin(measured+offset),Math.cos(measured+offset)));
 }
}
function solution(s,target){
 const me=s.players.find(p=>p.isSelf),points=[];
 for(let y=target.y-190;y<=target.y+190;y+=5)for(let x=target.x-190;x<=target.x+190;x+=5){let score=0,valid=true;
  for(const dx of [-8,0,8])for(const dy of [-8,0,8]){const q={x:x+dx,y:y+dy},safe=resolveWallCollisions(q,18,s.walls),lamp=selectLamp(q,s.lamps,s.walls);if(Math.hypot(safe.x-q.x,safe.y-q.y)>.01||!lamp){valid=false;continue;}const hand=calculateShadow(q,lamp,s.walls);if(!hand.active){valid=false;continue;}score=Math.max(score,Math.hypot(hand.handX-target.x,hand.handY-target.y));}
  if(valid&&score<49)points.push({x,y,score});
 }
 const point=points.sort((a,b)=>a.score-b.score+.0001*(Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y))).find(p=>findRoute(me,p,s.walls).length);assert(point,'Stable shadow approach');return point;
}
async function hold(p,target,fn,shot){
 await move(p,solution(await state(p),target));const me=await self(p);await orbit(p,Math.atan2(me.x-target.x,me.y-target.y));await p.keyboard.down('e');
 try{await wait(p,()=>window.gameState.theft.progress>.2);if(shot)await p.screenshot({path:`${out}/${shot}.png`});await wait(p,fn,target.id,7000);}
 catch(e){console.log('Interaction diagnostic',JSON.stringify({target,me:await self(p)}));await p.screenshot({path:`${out}/interaction-failure.png`});throw e;}
 finally{await p.keyboard.up('e');}
}
async function camera(guard,id){await guard.bringToFront();await guard.getByRole('button',{name:'CAM '+id.slice(-2),exact:true}).click({timeout:60000});await wait(guard,id=>window.gameState.guard.activeCameraId===id,id);}
async function scan(guard,p){await move(p,{x:780,y:850});await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();const badge=(await self(p)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);await wait(guard,()=>window.gameState.guard.charges>0,null,23000);await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(p,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);}
try{
 for(let i=0;i<4;i++){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.6}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:3000');await p.getByPlaceholder('Enter display name...').fill('Disguise '+i);pages.push(p);yaws.set(p,Math.PI/4);}
 await pages[0].getByRole('button',{name:'Create Room',exact:true}).click();await wait(pages[0],()=>window.gameState?.status==='lobby');const code=(await state(pages[0])).roomCode;
 for(const p of pages.slice(1)){await p.getByPlaceholder('CODE',{exact:true}).fill(code);await p.getByRole('button',{name:'Join Room',exact:true}).click();}
 await pages[0].getByRole('button',{name:/Start/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState?.status==='playing',null,90000);
 const roles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),guard=pages[roles.indexOf('guard')],thieves=pages.filter((p,i)=>roles[i]==='thief'),[actor,target]=thieves;
 const initial=await Promise.all(thieves.map(p=>self(p))),gs=await state(guard),round=gs.roundId;assert.equal(gs.readyCount,4);assert(initial.every(v=>!gs.players.some(p=>p.badgeNumber===v.badgeNumber)));for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(Math.hypot(initial[i].x-initial[j].x,initial[i].y-initial[j].y)>400);
 for(const p of thieves)await wait(p,()=>window.__visitorDiagnostics?.models.length===12,null,15000);await guard.screenshot({path:`${out}/initial-guard.png`});for(const [i,p]of thieves.entries())await p.screenshot({path:`${out}/separated-spawn-${i}.png`});console.log('Four real rendered clients ready; twelve floor models, hidden separated public spawns passed.');
 const old=await self(target);await scan(guard,target);await guard.getByRole('button',{name:'Select Suspect on CCTV',exact:true}).waitFor();assert.equal(await guard.getByText('Suspect #'+old.badgeNumber,{exact:true}).count(),0);
 await hold(actor,(await state(actor)).switches[0],()=>!window.gameState.players.some(p=>p.isTeammate&&p.isCaptured),'private-rescue');const next=await self(target);assert.equal(next.id,old.id);assert.notEqual(next.badgeNumber,old.badgeNumber);assert.notEqual(next.appearanceId,old.appearanceId);assert.equal((await state(target)).myRole,'thief');
 for(const p of thieves){await wait(p,({id,badge,look})=>window.gameState.players.some(v=>v.id===id&&v.badgeNumber===badge&&v.appearanceId===look),{id:old.id,badge:next.badgeNumber,look:next.appearanceId});await wait(p,({badge,old})=>window.__visitorDiagnostics.models.some(m=>m.badge===badge)&&!window.__visitorDiagnostics.models.some(m=>m.badge===old),{badge:next.badgeNumber,old:old.badgeNumber});}
 const hidden=await state(guard);assert(!hidden.players.some(p=>p.badgeNumber===next.badgeNumber||p.badgeNumber===old.badgeNumber));assert(!hidden.guard.inspecting);assert(!hidden.guard.recentAlerts.some(a=>a.includes('#'+next.badgeNumber)));await target.screenshot({path:`${out}/rescued-disguise.png`});console.log('Normal E rescue: synchronized new outfit/badge, stable private identity, retired model removal and no guard replacement disclosure passed.');
 await move(actor,{x:780,y:850});await move(target,{x:780,y:910});await orbit(actor,Math.PI);await wait(actor,b=>window.__visitorDiagnostics.models.find(m=>m.badge===b)?.marker,next.badgeNumber,15000);await actor.screenshot({path:`${out}/new-teammate-marker.png`});await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),next.badgeNumber);assert((await guard.evaluate(()=>window.__visitorDiagnostics.models)).every(m=>!m.marker));const recognized=(await state(actor)).players.find(p=>p.id===old.id);assert(recognized.isTeammate);assert.equal((await self(target)).appearanceId,next.appearanceId);console.log('New disguise recognized by actual private marker; guard receives it only after normal visible re-entry and has no markers.');
 for(const p of thieves)await scan(guard,p);await wait(guard,()=>window.gameState.status==='gameover');assert.equal((await state(guard)).winner,'guard');for(const p of pages)await wait(p,()=>window.gameState.status==='gameover');await pages[0].getByRole('button',{name:/Restart|Play Again/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState.status==='playing',null,90000);const nextRoles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),newGuard=pages[nextRoles.indexOf('guard')];assert.notEqual(newGuard,guard);assert.notEqual((await state(newGuard)).roundId,round);
 for(const p of pages){const s=await state(p);assert.equal(s.readyCount,4);assert.equal(s.guard.charges,3);assert(!s.guard.inspecting);assert(Object.values(s.guard.cameraPans).every(v=>v===0));assert(s.treasures.every(t=>!t.stolen));assert(s.players.every(p=>!p.isCaptured));}
 const s=await state(newGuard),newThieves=pages.filter(p=>p!==newGuard);for(const p of newThieves){const v=await self(p);assert(!s.players.some(p=>p.badgeNumber===v.badgeNumber));}assert.deepEqual(errors,[]);console.log('PASS four-browser identity protection: rescue disguise/rendering, badge/role stability, stale selection/roster removal, private marker, natural re-entry selection/capture, separated spawns, full replay barrier/reset.');
}catch(e){for(const [i,p]of pages.entries()){console.log('Identity failure',i,await p.evaluate(()=>({status:window.gameState?.status,role:window.gameState?.myRole,text:document.body.innerText.slice(-900)})));await p.screenshot({path:`${out}/failure-${i}.png`});}console.log('Page errors',errors);throw e;}finally{await browser.close();}
