import {prepareMatch} from './prepare-match.mjs';
import {LAMP_PUZZLES} from '../src/game/world.ts';
import {chromium} from 'playwright';import * as THREE from 'three';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {findRoute,clearPath} from '../src/game/navigation.ts';import {selectLamp,calculateShadow,isShadowTouchingTreasure,resolveWallCollisions} from '../src/game/physics.ts';import {COVER_PROBES} from '../src/game/cover-fixtures.ts';import {CAMERAS,cameraIsLive,cameraTarget} from '../src/game/cameras.ts';
const out='test-artifacts/lamps';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const pages=[],errors=[],yaws=new Map(),state=p=>p.evaluate(()=>window.gameState),self=p=>p.evaluate(()=>window.gameState.players.find(p=>p.isSelf));
async function wait(p,fn,arg,timeout=10000){return p.waitForFunction(fn,arg,{timeout});}
async function orbit(p,angle){
 const actual=await p.evaluate(()=>window.__thiefCameraView.yaw);let delta=Math.atan2(Math.sin(actual-angle),Math.cos(actual-angle))/.007;
 while(Math.abs(delta)>.01){const part=Math.max(-220,Math.min(220,delta));await p.mouse.move(950,650);await p.mouse.down();await p.mouse.move(950+part,650,{steps:4});await p.mouse.up();delta-=part;}
 await wait(p,angle=>Math.abs(Math.atan2(Math.sin(window.__thiefCameraView.yaw-angle),Math.cos(window.__thiefCameraView.yaw-angle)))<.01,angle);yaws.set(p,angle);
}
function orthogonal(a,b,walls,depth=0){
 const x={x:b.x,y:a.y},y={x:a.x,y:b.y};
 if(clearPath(a,x,walls)&&clearPath(x,b,walls))return [x,b];
 if(clearPath(a,y,walls)&&clearPath(y,b,walls))return [y,b];
 assert(depth<12,'orthogonal decomposition');const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};return [...orthogonal(a,mid,walls,depth+1),...orthogonal(mid,b,walls,depth+1)];
}
async function move(p,target,radius=28){
 await p.bringToFront();const s=await state(p);if(s.status!=='playing')return;const start=await self(p),route=findRoute(start,target,s.walls,radius).length?findRoute(start,target,s.walls,radius):findRoute(start,target,s.walls);assert(route.length,'route '+JSON.stringify(target));
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
 try{await wait(p,()=>window.gameState.theft.progress>.2);await wait(p,()=>{const actual=window.gameState.players.find(p=>p.isSelf).shadow;return window.__visitorDiagnostics?.shadows.some(s=>s.active&&!s.ordinary&&Math.abs(s.tipX-(actual.handX-400)*.05)<.015&&Math.abs(s.tipZ-(actual.handY-300)*.05)<.015);});if(shot)await p.screenshot({path:`${out}/${shot}.png`});await wait(p,fn,target.id,7000);}
 catch(e){console.log('Interaction diagnostic',JSON.stringify({target,me:await self(p)}));await p.screenshot({path:`${out}/interaction-failure.png`});throw e;}
 finally{await p.keyboard.up('e');}
}
async function camera(guard,id){await guard.bringToFront();await guard.getByRole('button',{name:'CAM '+id.slice(-2),exact:true}).click({timeout:60000});await wait(guard,id=>window.gameState.guard.activeCameraId===id,id);}
async function scan(guard,p){await move(p,{x:780,y:850});await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();const badge=(await self(p)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);await wait(guard,()=>window.gameState.guard.charges>0,null,23000);await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(p,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);}
try{
 for(let i=0;i<4;i++){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.6}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:3000');await p.getByPlaceholder('Enter display name...').fill('Lamp '+i);pages.push(p);yaws.set(p,Math.PI/4);}
 await pages[0].getByRole('button',{name:'Create Room',exact:true}).click();await wait(pages[0],()=>window.gameState?.status==='lobby');const code=(await state(pages[0])).roomCode;for(const p of pages.slice(1)){await p.getByPlaceholder('CODE',{exact:true}).fill(code);await p.getByRole('button',{name:'Join Room',exact:true}).click();}await pages[0].getByRole('button',{name:/Start/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState?.status==='playing',null,90000);
 const roles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),guard=pages[roles.indexOf('guard')],thieves=pages.filter((p,i)=>roles[i]==='thief');
 for(let i=0;i<3;i++){
  const p=thieves[i],plan=LAMP_PUZZLES[i],l=(await state(p)).lamps[i];await move(p,{x:l.x-44,y:l.y});await p.getByText('Space: Grab lamp',{exact:true}).waitFor();await p.keyboard.press('Space');await wait(p,id=>window.gameState.players.find(p=>p.isSelf).carryingId===id,l.id);await p.getByText('Space: Release lamp',{exact:true}).waitFor();await p.waitForTimeout(700);
  await wait(p,id=>window.__lampDiagnostics?.find(l=>l.id===id).highlighted,l.id);for(const other of pages.filter(o=>o!==p)){assert.equal(await other.evaluate(id=>window.__lampDiagnostics.find(l=>l.id===id).highlighted,l.id),false);}
  const before=(await state(p)).lamps[i];await orbit(p,1.1);await p.waitForTimeout(400);const after=(await state(p)).lamps[i];assert(Math.hypot(before.x-after.x,before.y-after.y)<.01,'orbit alone moves no lamp');await p.screenshot({path:`${out}/lamp-${i}-held.png`});
  const staging=i===0?[{x:1060,y:370},{x:500,y:370},{x:460,y:244}]:i===1?[{x:200,y:1094}]:[{x:1230,y:380},{x:1230,y:530},{x:1230,y:800},{x:1050,y:894}];
  for(const point of staging){await move(p,point,i===2||point.y===244?18:58);assert.equal((await self(p)).carryingId,l.id);}
  await move(p,{x:plan.lamp.x,y:plan.lamp.y+60},18);await move(p,{x:plan.lamp.x,y:plan.lamp.y+44},18);await p.waitForTimeout(600);await p.keyboard.press('Space');await wait(p,()=>!window.gameState.players.find(p=>p.isSelf).carryingId);const placed=(await state(p)).lamps[i];assert(Math.hypot(placed.x-plan.lamp.x,placed.y-plan.lamp.y)<25,JSON.stringify({placed,plan}));
  const cameraId=['cam_02','cam_04','cam_05'][i];await camera(guard,cameraId);await guard.screenshot({path:`${out}/lamp-${i}-guard.png`});assert.equal((await state(guard)).lamps[i].holderId,null);
  const target=(await state(p)).treasures[i];await hold(p,target,id=>window.gameState.treasures.find(t=>t.id===id).stolen,`lamp-${i}-theft`);console.log('PASS actual Space prompt/grab, holder-only ring, orbit independence, carried route and normal E theft:',l.id);
 }
 assert.deepEqual(errors,[]);console.log('PASS four browser sessions: all three reset-to-reposition-to-theft puzzles; no page errors.');
}catch(e){for(const [i,p]of pages.entries()){console.log('Lamp browser failure',i,await p.evaluate(()=>({status:window.gameState?.status,role:window.gameState?.myRole,me:window.gameState?.players.find(p=>p.isSelf),lamps:window.gameState?.lamps,text:document.body.innerText.slice(-700)})));await p.screenshot({path:`${out}/failure-${i}.png`});}throw e;}finally{await browser.close();}
