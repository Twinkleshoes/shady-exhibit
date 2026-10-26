import {prepareMatch} from './prepare-match.mjs';
import {chromium} from 'playwright';import * as THREE from 'three';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {findRoute,clearPath} from '../src/game/navigation.ts';import {selectLamp,calculateShadow,isShadowTouchingTreasure,resolveWallCollisions} from '../src/game/physics.ts';import {CAMERAS,cameraIsLive,cameraTarget} from '../src/game/cameras.ts';
const out='test-artifacts/gem-refinement';await mkdir(out,{recursive:true});
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
async function scan(guard,p){await camera(guard,'cam_01');await guard.getByRole('button',{name:'Center camera',exact:true}).click();const badge=(await self(p)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);await wait(guard,()=>window.gameState.guard.charges>0,null,23000);await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await wait(p,()=>window.gameState.players.find(p=>p.isSelf).isCaptured);}
try{
 for(let i=0;i<4;i++){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:.75}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:3000');await p.getByPlaceholder('Enter display name...').fill('Layout '+i);pages.push(p);yaws.set(p,Math.PI/4);}
 await pages[0].getByRole('button',{name:'Create Room',exact:true}).click();await wait(pages[0],()=>window.gameState?.status==='lobby');const code=(await state(pages[0])).roomCode;for(const p of pages.slice(1)){await p.getByPlaceholder('CODE',{exact:true}).fill(code);await p.getByRole('button',{name:'Join Room',exact:true}).click();}
 await pages[0].getByRole('button',{name:/Start/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState?.status==='playing');const roles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),guard=pages[roles.indexOf('guard')],thieves=pages.filter((p,i)=>roles[i]==='thief');

 const actor=thieves[0];
 assert.equal(await actor.getByText(/Camera jammer · align/).count(),0);
 await move(actor,{x:780,y:540});await orbit(actor,0);await actor.screenshot({path:`${out}/doorway-sign.png`});
 await move(actor,{x:700,y:350});await actor.getByText(/Camera jammer · align/).waitFor();await actor.screenshot({path:`${out}/contextual-jammer.png`});console.log('PASS mounted entrance and nearby jammer prompt; prompt absent from spawn.');
 if(process.env.LABEL_ONLY){
 await move(actor,{x:760,y:230});await orbit(actor,Math.atan2(80,110));await actor.screenshot({path:`${out}/final-supporting-case.png`});
 await move(actor,{x:1050,y:320});await orbit(actor,Math.atan2(-70,120));await actor.screenshot({path:`${out}/final-thief.png`});await camera(guard,'cam_02');await guard.getByRole('button',{name:'Center camera',exact:true}).click();
 const finalBadge=(await self(actor)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),finalBadge);await guard.getByText('Suspect #'+finalBadge,{exact:true}).click();await guard.screenshot({path:`${out}/final-guard.png`});
 for(const [key,label] of [['ArrowLeft','left'],['d','right']]){await guard.keyboard.down(key);await wait(guard,label=>label==='left'?window.gameState.guard.cameraPans.cam_02<-.86:window.gameState.guard.cameraPans.cam_02>.86,label,20000);await guard.keyboard.up(key);await guard.screenshot({path:`${out}/final-guard-${label}.png`});}
 assert.deepEqual(errors,[]);console.log('PASS final fixed doorway sign, close-only prompt, glass/contacts and clean guard view at center and both pan extremes.');await browser.close();process.exit(0);}

 await move(actor,{x:600,y:230});
 for(const [i,a] of [-.35,-.6,-.85].entries()){await orbit(actor,a);await actor.waitForTimeout(120);await actor.screenshot({path:`${out}/case-orbit-${i}.png`});}
 await move(actor,{x:760,y:230});await orbit(actor,.5);await actor.screenshot({path:`${out}/cases-after-walking.png`});console.log('PASS real WASD movement and mouse orbit around both supporting glass cases.');
 const treasure=(await state(actor)).treasures[0];await hold(actor,treasure,id=>window.gameState.treasures.find(t=>t.id===id).stolen,'sapphire-stealing');assert((await state(guard)).treasures[0].stolen);console.log('PASS actual three-second shadow steal and synchronized treasure removal.');
 await move(actor,{x:1050,y:320});await orbit(actor,Math.atan2(-70,120));await actor.screenshot({path:`${out}/thief-refined-case.png`});
 await camera(guard,'cam_02');await guard.getByRole('button',{name:'Center camera',exact:true}).click();
 const badge=(await self(actor)).badgeNumber;await wait(guard,b=>window.gameState.players.some(p=>p.badgeNumber===b),badge);
 const visitor=(await state(guard)).players.find(p=>p.badgeNumber===badge),bounds=await guard.locator('canvas').boundingBox();assert(visitor&&bounds);const c=CAMERAS.find(c=>c.id==='cam_02');const lens=new THREE.PerspectiveCamera(54,bounds.width/bounds.height,.1,220);lens.position.fromArray(c.position);lens.lookAt(cameraTarget(c.id,0));lens.updateMatrixWorld();const point=new THREE.Vector3((visitor.x-400)*.05,1.25,(visitor.y-300)*.05).project(lens);
 await guard.mouse.click(bounds.x+(point.x+1)*bounds.width/2,bounds.y+(1-point.y)*bounds.height/2);await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).waitFor();await guard.screenshot({path:`${out}/guard-selection.png`});
 await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await guard.keyboard.down('d');await wait(guard,()=>!window.gameState.guard.inspecting&&window.gameState.guard.charges===2);await guard.keyboard.up('d');assert(!(await self(actor)).isCaptured);console.log('PASS canvas badge selection and pan-away inspection cancellation without refund.');
 for(const c of CAMERAS){await camera(guard,c.id);await guard.getByRole('button',{name:'Center camera',exact:true}).click();await guard.waitForTimeout(150);await guard.screenshot({path:`${out}/${c.id}-center.png`});
  if(c.id==='cam_02')for(const [key,label] of [['ArrowLeft','left'],['d','right']]){await guard.keyboard.down(key);await wait(guard,({id,label})=>label==='left'?window.gameState.guard.cameraPans[id]<-.86:window.gameState.guard.cameraPans[id]>.86,{id:c.id,label},20000);await guard.keyboard.up(key);await guard.screenshot({path:`${out}/cam_02-${label}.png`});}
 }
 assert.deepEqual(errors,[]);console.log('PASS final refinement: four independent browsers, contextual prompt, moving/orbit case views, shadow theft, guard canvas selection, cancellation and all six feeds.');await browser.close();
}catch(e){await browser.close();throw e;}
