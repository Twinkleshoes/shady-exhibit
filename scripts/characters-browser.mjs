import {prepareMatch} from './prepare-match.mjs';
import {chromium} from 'playwright';import * as THREE from 'three';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {findRoute,clearPath} from '../src/game/navigation.ts';import {selectLamp,calculateShadow,isShadowTouchingTreasure,resolveWallCollisions} from '../src/game/physics.ts';import {CAMERAS,cameraIsLive,cameraTarget} from '../src/game/cameras.ts';
const out='test-artifacts/visitors';await mkdir(out,{recursive:true});
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
async function camera(guard,id){await guard.bringToFront();await guard.getByRole('button',{name:'CAM '+id.slice(-2),exact:true}).click();await wait(guard,id=>window.gameState.guard.activeCameraId===id,id);}
async function scan(guard,p){await move(p,{x:780,y:850});await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();const badge=(await self(p)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);await wait(guard,()=>window.gameState.guard.charges>0,null,23000);await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(p,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);}
try{
 for(let i=0;i<4;i++){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.6}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:3000');await p.getByPlaceholder('Enter display name...').fill('Layout '+i);pages.push(p);yaws.set(p,Math.PI/4);}
 await pages[0].getByRole('button',{name:'Create Room',exact:true}).click();await wait(pages[0],()=>window.gameState?.status==='lobby');const code=(await state(pages[0])).roomCode;for(const p of pages.slice(1)){await p.getByPlaceholder('CODE',{exact:true}).fill(code);await p.getByRole('button',{name:'Join Room',exact:true}).click();}
 await pages[0].getByRole('button',{name:/Start/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState?.status==='playing');const roles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),guard=pages[roles.indexOf('guard')],thieves=pages.filter((p,i)=>roles[i]==='thief');

 let actor=thieves[0],stable=new Map((await state(actor)).players.map(p=>[p.badgeNumber,p.appearanceId]));assert.equal(stable.size,12);assert.equal(new Set(stable.values()).size,12);
 for(const p of thieves){await p.waitForFunction(()=>window.__visitorDiagnostics?.models.length===12);const d=await p.evaluate(()=>window.__visitorDiagnostics);assert(d.models.every(m=>m.bones===15&&m.vertices>1000));for(const m of d.models)assert.equal(m.appearanceId,stable.get(m.badge));}
 const perf=[];for(let i=0;i<4;i++){await actor.waitForTimeout(800);for(const p of thieves)perf.push((await p.evaluate(()=>window.__visitorDiagnostics)).fps);}
 console.log('All 12 visitors loaded on three thief clients. Software WebGL FPS samples:',JSON.stringify(perf.map(v=>Math.round(v*10)/10)));
 if(process.env.PERFORMANCE_ONLY){console.log('PASS final software fallback sample with all twelve floor models and four connected sessions.');await browser.close();process.exit(0);}
 await actor.keyboard.press('f');await wait(actor,()=>window.gameState.players.find(p=>p.isSelf).action==='admire');const badge=(await self(actor)).badgeNumber;
 for(const p of thieves)await wait(p,b=>window.gameState.players.find(p=>p.badgeNumber===b).action==='admire',badge);
 await actor.waitForFunction(b=>window.__visitorDiagnostics.models.find(m=>m.badge===b)?.elbow<-.4,badge);await actor.screenshot({path:`${out}/admiring.png`});
 await move(actor,{x:620,y:780});await actor.waitForFunction(b=>window.__visitorDiagnostics.models.find(m=>m.badge===b)?.peakKnee>.1,badge);const walk=await actor.evaluate(()=>window.__visitorDiagnostics);assert(walk.models.every(m=>m.feet.every(y=>y>=-.02)));await actor.screenshot({path:`${out}/walking.png`});
 await move(actor,{x:620,y:780});await actor.keyboard.press('f');await wait(actor,()=>window.gameState.players.find(p=>p.isSelf).action==='admire');await actor.waitForTimeout(500);await orbit(actor,(await self(actor)).heading);await actor.screenshot({path:`${out}/visitor-portrait.png`});console.log('Actual F admire, shared action, walk cancellation, knee bending and grounded foot heights passed.');
 await move(actor,{x:620,y:850});await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);
 const c=CAMERAS[0],v=(await state(guard)).players.find(p=>p.badgeNumber===badge),bounds=await guard.locator('canvas').boundingBox(),lens=new THREE.PerspectiveCamera(54,bounds.width/bounds.height,.1,220);lens.position.fromArray(c.position);lens.lookAt(cameraTarget(c.id,0));lens.updateMatrixWorld();const point=new THREE.Vector3((v.x-400)*.05,1.25,(v.y-300)*.05).project(lens),mx=bounds.x+(point.x+1)*bounds.width/2,my=bounds.y+(1-point.y)*bounds.height/2;
 await guard.mouse.move(mx,my);await guard.waitForFunction(b=>window.__visitorDiagnostics.models.some(m=>m.badge===b&&m.label),badge);await guard.mouse.click(mx,my);await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).waitFor();await guard.mouse.move(10,10);await guard.screenshot({path:`${out}/guard-selected.png`});
 const gd=await guard.evaluate(()=>window.__visitorDiagnostics);assert(gd.models.every(m=>!m.marker));for(const m of gd.models)assert.equal(m.appearanceId,stable.get(m.badge));
 console.log('Actual body hover/selection, reduced badges, guard marker privacy and synchronized looks passed.');
 await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(actor,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);
 for(const p of thieves.filter(p=>p!==actor))await scan(guard,p);await wait(guard,()=>window.gameState.status==='gameover');
 await pages[0].getByRole('button',{name:/Restart|Play Again/}).click();
 try{await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState.status==='playing',null,30000);}catch(e){console.log('Replay states',JSON.stringify(await Promise.all(pages.map(p=>p.evaluate(()=>({status:window.gameState?.status,role:window.gameState?.myRole}))))),'errors',JSON.stringify(errors));throw e;}
 actor=pages[(await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole)))).findIndex(r=>r==='thief')];stable=new Map((await state(actor)).players.map(p=>[p.badgeNumber,p.appearanceId]));console.log('Actual three captures, guard victory and browser replay with fresh appearances passed.');

 await hold(actor,(await state(actor)).treasures[0],id=>window.gameState.treasures.find(t=>t.id===id).stolen,'accurate-reaching-shadow');const sd=await actor.evaluate(()=>window.__visitorDiagnostics.shadows);const actual=(await self(actor)).shadow;const nextBadge=(await self(actor)).badgeNumber;const sh=sd.find(s=>s.active&&!s.ordinary&&s.id.includes(':'+nextBadge+':'));assert(sh);assert(Math.abs(sh.tipX-(actual.handX-400)*.05)<.015);assert(Math.abs(sh.tipZ-(actual.handY-300)*.05)<.015);console.log('Browser normal shadow theft and actual rendered fingertip/server hand equality passed.');
 for(const p of pages.filter(p=>p!==guard))for(const v of (await state(p)).players)assert.equal(v.appearanceId,stable.get(v.badgeNumber));
 assert.deepEqual(errors,[]);console.log('PASS visitor rig, twelve appearances, four independent sessions, admire/walk blending, feet, hover/select, private labels, accurate hand and all visitors present.');await browser.close();
}catch(e){await browser.close();throw e;}
