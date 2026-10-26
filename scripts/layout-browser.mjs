import {prepareMatch} from './prepare-match.mjs';
import {chromium} from 'playwright';import * as THREE from 'three';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {findRoute,clearPath} from '../src/game/navigation.ts';import {selectLamp,calculateShadow,isShadowTouchingTreasure,resolveWallCollisions} from '../src/game/physics.ts';import {CAMERAS,cameraIsLive,cameraTarget} from '../src/game/cameras.ts';
const out='test-artifacts/atrium';await mkdir(out,{recursive:true});
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
 for(let i=0;i<4;i++){const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:(process.env.CAMERA_SWEEP_ONLY||process.env.UI_SMOKE_ONLY)?1:.6}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.TEST_URL||'http://127.0.0.1:3000');await p.getByPlaceholder('Enter display name...').fill('Layout '+i);pages.push(p);yaws.set(p,Math.PI/4);}
 await pages[0].getByRole('button',{name:'Create Room',exact:true}).click();await wait(pages[0],()=>window.gameState?.status==='lobby');const code=(await state(pages[0])).roomCode;for(const p of pages.slice(1)){await p.getByPlaceholder('CODE',{exact:true}).fill(code);await p.getByRole('button',{name:'Join Room',exact:true}).click();}
 await pages[0].getByRole('button',{name:/Start/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState?.status==='playing',null,45000);const roles=await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole))),guard=pages[roles.indexOf('guard')],thieves=pages.filter((p,i)=>roles[i]==='thief');
 const initial=await Promise.all(thieves.map(p=>self(p))),initialGuard=await state(guard);assert(initial.every(t=>!initialGuard.players.some(v=>v.badgeNumber===t.badgeNumber)));
 for(const [i,p]of thieves.entries())await move(p,{x:620+i*80,y:850});
 if(!process.env.REPLAY_ONLY){
 for(const [i,p]of thieves.entries()){const me=await self(p),c=CAMERAS[0];await orbit(p,Math.atan2(me.x-(c.position[0]/.05+400),me.y-(c.position[2]/.05+300)));await p.screenshot({path:`${out}/thief-${i}-atrium-live.png`});const s=await state(p);assert.deepEqual(CAMERAS.filter(c=>cameraIsLive(s,c.id)).map(c=>c.id),['cam_01']);}
 console.log('Three independent thieves: atrium, physical LIVE camera and synchronized state.');
 if(process.env.CAMERA_SWEEP_ONLY||process.env.UI_SMOKE_ONLY){const viewer=thieves[2];await move(viewer,{x:780,y:620});const me=await self(viewer);await orbit(viewer,Math.atan2(me.x-(CAMERAS[0].position[0]/.05+400),me.y-(CAMERAS[0].position[2]/.05+300)));await viewer.mouse.move(950,650);await viewer.mouse.down();await viewer.mouse.move(950,610,{steps:5});await viewer.mouse.up();await viewer.waitForTimeout(200);await viewer.screenshot({path:`${out}/physical-camera-live-close.png`});await camera(guard,'cam_02');for(const p of thieves)await wait(p,()=>window.gameState.guard.activeCameraId==='cam_02');await viewer.screenshot({path:`${out}/physical-camera-neutral-close.png`});await camera(guard,'cam_01');}

 for(const c of ((process.env.CAMERA_SWEEP_ONLY||process.env.UI_SMOKE_ONLY)?CAMERAS:[])){await camera(guard,c.id);await guard.getByRole('button',{name:'Center camera',exact:true}).click();await guard.waitForTimeout(200);await guard.screenshot({path:`${out}/${c.id}-center.png`});
  if(c.id==='cam_01'){
   const badge=(await self(thieves[0])).badgeNumber,visitor=(await state(guard)).players.find(p=>p.badgeNumber===badge),bounds=await guard.locator('canvas').boundingBox();assert(visitor&&bounds);
   const lens=new THREE.PerspectiveCamera(54,bounds.width/bounds.height,.1,220);lens.position.fromArray(c.position);lens.lookAt(cameraTarget(c.id,0));lens.updateMatrixWorld();const point=new THREE.Vector3((visitor.x-400)*.05,1.25,(visitor.y-300)*.05).project(lens);
   await guard.mouse.click(bounds.x+(point.x+1)*bounds.width/2,bounds.y+(1-point.y)*bounds.height/2);await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).waitFor();
   const button=await guard.getByRole('button',{name:'Pan camera right',exact:true}).boundingBox();await guard.mouse.move(button.x+button.width/2,button.y+button.height/2);await guard.mouse.down();await guard.waitForFunction(()=>window.gameState.guard.cameraPans.cam_01>.1);await guard.mouse.up();await guard.waitForTimeout(120);const saved=(await state(guard)).guard.cameraPans.cam_01;
   await camera(guard,'cam_02');await camera(guard,'cam_01');assert.equal((await state(guard)).guard.cameraPans.cam_01,saved);await guard.getByRole('button',{name:'Center camera',exact:true}).click();console.log('Actual canvas badge selection, held pan button and saved feed position passed.');
  }

  for(const [key,label]of (process.env.UI_SMOKE_ONLY?[]:[['ArrowLeft','left'],['d','right']])){await guard.bringToFront();await guard.keyboard.down(key);await guard.waitForFunction(({id,label})=>label==='left'?window.gameState.guard.cameraPans[id]<-.86:window.gameState.guard.cameraPans[id]>.86,{id:c.id,label},{timeout:20000});await guard.keyboard.up(key);await guard.waitForTimeout(150);assert(Math.abs((await state(guard)).guard.cameraPans[c.id])>.85);await guard.screenshot({path:`${out}/${c.id}-${label}.png`});if(c.id==='cam_01')await thieves[2].screenshot({path:`${out}/physical-camera-panned-${label}.png`});}
  await guard.getByRole('button',{name:'Center camera',exact:true}).click();console.log('Captured '+c.id+(process.env.UI_SMOKE_ONLY?' center.':' center and both 50 degree limits.'));}
 if(process.env.CAMERA_SWEEP_ONLY||process.env.UI_SMOKE_ONLY){assert.deepEqual(errors,[]);console.log(process.env.UI_SMOKE_ONLY?'PASS: final UI labels, six actual feeds, physical LIVE/neutral, canvas selection and held pan.':'PASS: all six actual feeds at center and both pan limits, three thief clients and LIVE state.');await browser.close();process.exit(0);}
 const actor=thieves[0],other=thieves.find(p=>p!==actor);
 await camera(guard,'cam_01');const badge=(await self(actor)).badgeNumber;await guard.getByText('Suspect #'+badge,{exact:true}).click();await guard.getByRole('button',{name:'Inspect Suspect #'+badge,exact:true}).click();await guard.keyboard.down('d');await wait(guard,()=>!window.gameState.guard.inspecting&&window.gameState.guard.charges===2);await guard.keyboard.up('d');assert(!(await self(actor)).isCaptured);await guard.screenshot({path:`${out}/inspection-cancelled.png`});await guard.getByRole('button',{name:'Center camera',exact:true}).click();console.log('Actual UI selection and pan-away cancellation without refund passed.');
 await scan(guard,other);await other.screenshot({path:`${out}/security-holding.png`});const rescue=(await state(actor)).switches[0];await hold(actor,rescue,()=>!window.gameState.players.some(p=>p.isTeammate&&p.isCaptured),'shadow-rescue');console.log('Browser capture and shadow rescue passed.');
 for(const i of [0,1,2]){const t=(await state(actor)).treasures[i];await hold(actor,t,id=>window.gameState.treasures.find(t=>t.id===id).stolen,'puzzle-'+i);console.log('Browser real WASD/E theft '+t.room+' passed.');if(i===0){const sw=(await state(actor)).switches.find(s=>s.kind==='camera');await camera(guard,sw.cameraId);await hold(actor,sw,()=>window.gameState.guard.disabledCameras.cam_02>0,'shadow-disruption');for(const p of thieves){const s=await state(p);assert.equal(CAMERAS.filter(c=>cameraIsLive(s,c.id)).length,0);}}}
 // Every free human traverses the map and gathers in the actual escape zone.
 for(const p of thieves)await move(p,{x:850,y:1120});await wait(guard,()=>window.gameState.status==='gameover');assert.equal((await state(guard)).winner,'thieves');await guard.screenshot({path:`${out}/thieves-victory.png`});console.log('Browser simultaneous escape victory passed.');
 }else{for(const p of thieves)await scan(guard,p);await wait(guard,()=>window.gameState.status==='gameover');assert.equal((await state(guard)).winner,'guard');console.log('Fresh-round three captures and guard victory passed.');}
 await pages[0].getByRole('button',{name:/Restart|Play Again/}).click();await prepareMatch(pages);for(const p of pages)await wait(p,()=>window.gameState.status==='playing',null,30000);const nextGuard=pages[(await Promise.all(pages.map(p=>p.evaluate(()=>window.gameState.myRole)))).indexOf('guard')];assert(nextGuard!==guard);for(const p of pages){const s=await state(p);assert(Object.values(s.guard.cameraPans).every(n=>n===0));assert(s.treasures.every(t=>!t.stolen));assert(s.lamps.every(l=>!l.holderId));}
 console.log('Replay role state',JSON.stringify(await Promise.all(pages.map(p=>p.evaluate(()=>({role:window.gameState.myRole,status:window.gameState.status,hasGuardPanel:document.body.innerText.includes('MUSEUM SECURITY COMMAND')}))))));
 for(const p of pages.filter(p=>p!==nextGuard))await scan(nextGuard,p);await wait(nextGuard,()=>window.gameState.status==='gameover');assert.equal((await state(nextGuard)).winner,'guard');await nextGuard.screenshot({path:`${out}/guard-victory.png`});assert.deepEqual(errors,[]);console.log(process.env.REPLAY_ONLY?'PASS four browser contexts: three captures, guard victory, replay rotation/reset and three captures by the new guard.':'PASS four browser contexts: LIVE, selection, cancellation, capture/rescue, three keyboard thefts, disruption, escape, both wins and replay rotation/reset.');
}catch(e){for(const [i,p]of pages.entries())console.log('Browser failure',i,await p.evaluate(()=>({role:window.gameState?.myRole,status:window.gameState?.status,text:document.body.innerText.slice(0,900)})));console.log('Page errors',errors);throw e;}finally{await browser.close();}
