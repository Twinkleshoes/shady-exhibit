import {prepareMatch} from './prepare-match.mjs';
import {chromium} from 'playwright';import * as THREE from 'three';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {findRoute,clearPath} from '../src/game/navigation.ts';import {selectLamp,calculateShadow,isShadowTouchingTreasure,resolveWallCollisions} from '../src/game/physics.ts';import {CAMERAS,cameraIsLive,cameraTarget} from '../src/game/cameras.ts';
const out='test-artifacts/materials';await mkdir(out,{recursive:true});
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
   if(Math.abs(delta)>=7){await p.screenshot({path:`${out}/movement-failure.png`});console.log('Focus',await p.evaluate(()=>({active:document.activeElement?.tagName,errors:document.body.innerText.slice(-600)})));}assert(Math.abs(delta)<7,'keyboard leg blocked '+JSON.stringify({point,dimension,me:current}));
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
async function scan(guard,p){await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();const badge=(await self(p)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);await wait(guard,()=>window.gameState.guard.charges>0,null,23000);await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(p,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);}
try{
 for(let i=0;i<4;i++){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.75}),p=await context.newPage();p.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});await p.goto(process.env.TEST_URL||'http://127.0.0.1:3000');await p.getByPlaceholder('Enter display name...').fill('Layout '+i);pages.push(p);yaws.set(p,Math.PI/4);}
 await pages[0].getByRole('button',{name:'Create Room',exact:true}).click();await wait(pages[0],()=>window.gameState?.status==='lobby');const code=(await state(pages[0])).roomCode;for(const p of pages.slice(1)){await p.getByPlaceholder('CODE',{exact:true}).fill(code);await p.getByRole('button',{name:'Join Room',exact:true}).click();}
 await pages[0].getByRole('button',{name:/Start/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState?.status==='playing',null,45000);const roles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),guard=pages[roles.indexOf('guard')],thieves=pages.filter((p,i)=>roles[i]==='thief');

 const actor=thieves[0];
 async function benchmark(){const samples=[];for(let i=0;i<8;i++){samples.push(await Promise.all(thieves.map(p=>p.evaluate(()=>({fps:window.__visitorDiagnostics?.fps,drawCalls:window.__visitorDiagnostics?.drawCalls,triangles:window.__visitorDiagnostics?.triangles,visitors:window.__visitorDiagnostics?.models.length})))));await actor.waitForTimeout(500);}await writeFile(`${out}/performance.json`,JSON.stringify(samples,null,2));assert(samples.every(row=>row.every(d=>d.visitors===12)),'All twelve shared visitor models present on every thief client');console.log('Four simultaneous software-WebGL views, three thief samples:',JSON.stringify(samples));}
 async function photo(name,pos,target){await move(actor,pos);const me=await self(actor);await orbit(actor,Math.atan2(me.x-target.x,me.y-target.y));await actor.waitForTimeout(450);await actor.screenshot({path:`${out}/${name}-thief.png`});console.log('Thief material view',name);}
 if(process.env.DETAILS_ONLY){
 await photo('sculpture-study',{x:220,y:300},{x:140,y:180});
 await photo('history-intro',{x:1260,y:350},{x:1325,y:110});
 await photo('reception',{x:700,y:1340},{x:700,y:1250});
 assert.deepEqual(errors,[]);console.log('PASS normal-control study bay, history introduction bay, south entrance/reception and routes.');await browser.close();process.exit(0);}
 if(!process.env.FEEDS_ONLY){
 await photo('atrium',{x:800,y:780},{x:680,y:660});
 await photo('gem',{x:870,y:340},{x:700,y:200});
 await photo('sculpture',{x:220,y:1110},{x:140,y:830});
 const sculptureYaw=yaws.get(actor);for(const [label,offset]of [['left',-.2],['right',.2]]){await orbit(actor,sculptureYaw+offset);await actor.screenshot({path:`${out}/sculpture-orbit-${label}.png`});}await orbit(actor,sculptureYaw);
 await photo('history',{x:1150,y:780},{x:1080,y:605});
 await photo('history-art',{x:1200,y:920},{x:1360,y:870});
 await photo('atrium-skylight',{x:700,y:1180},{x:700,y:700});
 await actor.mouse.move(950,650);await actor.mouse.down();await actor.mouse.move(950,610,{steps:5});await actor.mouse.up();await actor.waitForTimeout(450);await actor.screenshot({path:`${out}/atrium-skylight-thief.png`});
 await actor.mouse.move(950,650);await actor.mouse.down();await actor.mouse.move(950,690,{steps:5});await actor.mouse.up();
 if(process.env.SCREENSHOTS_ONLY){await benchmark();assert.deepEqual(errors,[]);console.log('PASS final composed room photographs from normal third-person movement.');await browser.close();process.exit(0);}
 }
 // NPCs remain real wandering visitors; the human walks through the same clear routes.
 for(const c of CAMERAS){await camera(guard,c.id);await guard.getByRole('button',{name:'Center camera',exact:true}).click();await guard.waitForTimeout(150);await guard.screenshot({path:`${out}/${c.id}-center.png`});
  for(const [key,label]of [['ArrowLeft','left'],['d','right']]){await guard.keyboard.down(key);await wait(guard,({id,label})=>label==='left'?window.gameState.guard.cameraPans[id]<-.86:window.gameState.guard.cameraPans[id]>.86,{id:c.id,label},20000);await guard.keyboard.up(key);await guard.screenshot({path:`${out}/${c.id}-${label}.png`});}
  await guard.getByRole('button',{name:'Center camera',exact:true}).click();console.log('Finished-room visual sweep '+c.id+' at center and both limits.');
 }
 await move(actor,{x:1180,y:1150});await camera(guard,'cam_06');const badge=(await self(actor)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(actor,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);console.log('History feed actual selection and completed inspection passed.');
 await benchmark();
 assert.deepEqual(errors,[]);console.log('PASS four independent browser contexts: all three thief room views, six feeds at center/limits, visitor selection and completed inspection.');await browser.close();
}catch(e){for(const [i,p]of pages.entries()){try{console.log('Visual failure state',i,await p.evaluate(()=>({status:window.gameState?.status,role:window.gameState?.myRole,models:window.__visitorDiagnostics?.models.length,canvas:!!document.querySelector('canvas')})));await p.screenshot({path:`${out}/failure-${i}.png`,timeout:15000});}catch{}}await browser.close();throw e;}
