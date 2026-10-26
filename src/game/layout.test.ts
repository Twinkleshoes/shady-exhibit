import * as THREE from 'three';import {createArchitecture} from './architecture.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {LAMP_PUZZLES,defaultWalls,defaultMovables,defaultLamps,defaultTreasures,defaultSwitches,movableWalls,DOORWAYS,SPAWNS,NPC_SPAWNS,ROOMS,HOLDING,ESCAPE,roomName,inside} from './world.js';
import {findRoute,clearPath,VIEWING_POINTS} from './navigation.js';
import {resolveWallCollisions,calculateShadow,isShadowTouchingTreasure,selectLamp} from './physics.js';
import {CAMERAS,visibleOnCamera} from './cameras.js';import {CAMERA_PAN_LIMIT} from './settings.js';
import {newRoom,newPlayer,startRound,stepRoom,capture,lobby} from './engine.js';
const walls=[...defaultWalls(),...movableWalls(defaultMovables())];
function fixture(){const r=newRoom('LAY','0');r.playerOrder=['0','1','2','3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r);return r;}
test('All nine doorways admit visitors, lamps and carried displays in both directions',()=>{
 for(const d of DOORWAYS)for(const radius of [18,14,Math.hypot(20,25)]){assert(clearPath(d.a,d.b,walls,radius),d.id+' clearance');for(const [a,b] of [[d.a,d.b],[d.b,d.a]]){let pos={...a};for(let i=0;i<40;i++){const dx=b.x-pos.x,dy=b.y-pos.y,dist=Math.hypot(dx,dy);if(dist<1)break;pos=resolveWallCollisions({x:pos.x+dx/dist*Math.min(4,dist),y:pos.y+dy/dist*Math.min(4,dist)},radius,walls);}assert(Math.hypot(pos.x-b.x,pos.y-b.y)<1,d.id);}}
});
test('Full exterior circulation loop works with atrium blocked; atrium connects all galleries',()=>{
 const blocked=[...walls,{id:'test_no_atrium',x:466,y:466,width:468,height:734,elevation:5}];
 for(const [a,b]of [[{x:220,y:600},{x:1160,y:600}],[{x:220,y:1300},{x:1160,y:1300}]]){const route=findRoute(a,b,blocked);assert(route.length);for(const p of route)assert(!inside(p,{x:466,y:466,width:468,height:734}));}
 for(const p of VIEWING_POINTS)assert(findRoute(SPAWNS[0],p,walls).length,JSON.stringify(p));
});
test('All spawns, lamps, switches and viewing destinations are on navigable floor',()=>{
 for(const p of [...SPAWNS,...NPC_SPAWNS,...defaultLamps(),...defaultSwitches(),...VIEWING_POINTS]){const out=resolveWallCollisions(p,18,walls);assert(Math.hypot(out.x-p.x,out.y-p.y)<.01,JSON.stringify(p));}
});
test('Three different repositioned lamp puzzles have body-reachable shadow solutions without moving static geometry',()=>{
 const lamps=defaultLamps();for(const a of LAMP_PUZZLES)Object.assign(lamps.find(l=>l.id===a.id)!,a.lamp);
 for(const target of defaultTreasures()){let found=false;for(let y=target.y-180;y<=target.y+180&&!found;y+=5)for(let x=target.x-180;x<=target.x+180&&!found;x+=5){const p={x,y},safe=resolveWallCollisions(p,18,walls),lamp=selectLamp(p,lamps,walls);if(Math.hypot(safe.x-x,safe.y-y)<.01&&lamp&&isShadowTouchingTreasure(calculateShadow(p,lamp,walls),target)&&findRoute(SPAWNS[0],p,walls).length)found=true;}assert(found,target.name);}
});
test('NPCs cross room boundaries, pause and remain outside every wall over a simulated three minutes',()=>{
 const r=fixture(),visited=r.visitors.map(p=>new Set([roomName(p)]));let paused=false,moving=false;
 for(let i=0;i<3600;i++){stepRoom(r,.05,1000);for(const [j,p]of r.visitors.entries()){visited[j].add(roomName(p));paused ||= p.walkSpeed===0;moving ||= p.walkSpeed>119;const safe=resolveWallCollisions(p,18,r.walls);assert(Math.hypot(safe.x-p.x,safe.y-p.y)<.01);}}
 assert(paused&&moving);assert(visited.every(v=>v.size>=2),JSON.stringify(visited.map(v=>[...v])));assert(visited.some(v=>v.size>=4));
});
test('All cameras retain useful unobstructed floor coverage throughout full pan; no camera sees rescue and escape together',()=>{
 const rescue=defaultSwitches()[0],escapePoints=[];for(let y=ESCAPE.y;y<=ESCAPE.y+ESCAPE.height;y+=13)for(let x=ESCAPE.x;x<=ESCAPE.x+ESCAPE.width;x+=13)escapePoints.push({x,y});
 for(const c of CAMERAS)for(let pan=-CAMERA_PAN_LIMIT;pan<=CAMERA_PAN_LIMIT+.001;pan+=CAMERA_PAN_LIMIT/5){let count=0;for(let y=40;y<1400;y+=40)for(let x=40;x<1400;x+=40){const p={x,y},safe=resolveWallCollisions(p,18,walls);if(Math.hypot(safe.x-x,safe.y-y)<.01&&visibleOnCamera(p,c.id,walls,1.5,1.1,pan))count++;}assert(count>=4,c.id+' coverage '+pan+' '+count);assert(defaultTreasures().filter(t=>visibleOnCamera(t,c.id,walls,1.5,1.65,pan)).length<3,c.id+' covers all treasures');assert(!(visibleOnCamera(rescue,c.id,walls,1.5,1.1,pan)&&escapePoints.some(p=>visibleOnCamera(p,c.id,walls,1.5,1.1,pan))),c.id+' both critical targets');}
});
test('New-map objects, captures, cooldowns, pan and inputs reset on replay with rotated guard',()=>{
 const r=fixture(),old=r.guardIndex;for(const p of Object.values(r.players).filter(p=>p.role==='thief'))capture(r,p);
 r.lamps[0].x+=100;r.movables[0].y+=100;r.treasures[0].stolen=true;r.switches[1].cooldown=29;r.disabledCameras.cam_02=5;r.cameraPans.cam_04=.8;r.roundTimeLeft=1;
 lobby(r);startRound(r);assert.notEqual(r.guardIndex,old);assert.deepEqual(r.lamps,defaultLamps());assert.deepEqual(r.movables,defaultMovables());assert.deepEqual(r.treasures,defaultTreasures());assert.deepEqual(r.switches,defaultSwitches());assert.equal(r.roundTimeLeft,360);assert.deepEqual(r.disabledCameras,{});assert(Object.values(r.cameraPans).every(p=>p===0));assert(Object.values(r.players).every(p=>!p.isCaptured&&!p.isStealing&&p.input.dx===0));
});

test('Every treasure has two distinct body approaches connected to different entrances',()=>{
 const approaches=[
  {a:{x:580,y:220},b:{x:700,y:340},doors:['gem-west-bay','gem-atrium']},
  {a:{x:200,y:750},b:{x:200,y:930},doors:['gem-sculpture','sculpture-south']},
  {a:{x:1150,y:850},b:{x:1280,y:850},doors:['gem-history','history-south']},
 ];
 for(const p of approaches){assert(Math.hypot(p.a.x-p.b.x,p.a.y-p.b.y)>80);for(const [i,q]of [p.a,p.b].entries()){assert(clearPath(q,q,walls));assert(findRoute(DOORWAYS.find(d=>d.id===p.doors[i])!.b,q,walls).length);}assert(findRoute(p.a,p.b,walls).length);}
});
test('Each treasure remains visible from at least one enabled camera angle and architectural heights differ',()=>{
 for(const t of defaultTreasures())assert(CAMERAS.some(c=>[-CAMERA_PAN_LIMIT,-.4,0,.4,CAMERA_PAN_LIMIT].some(pan=>visibleOnCamera(t,c.id,walls,1.5,1.73,pan))),t.name);
 const hall=ROOMS.find(r=>r.id==='atrium')!,gem=ROOMS[0],sculpture=ROOMS[1],history=ROOMS[2];assert(hall.ceiling>sculpture.ceiling&&sculpture.ceiling>gem.ceiling&&gem.ceiling>history.ceiling);
 assert(gem.width*gem.height<sculpture.width*sculpture.height);assert(ROOMS.find(r=>r.id==='sculpture-study')!.width>ROOMS.find(r=>r.id==='history-intro')!.width);
});

test('Architectural ornament batches generate valid renderable geometry with finite bounds',()=>{
 const scene=new THREE.Scene();createArchitecture(scene);assert(scene.children.length<=6&&scene.children.length>=4);
 for(const object of scene.children){const m=object as THREE.Mesh;assert(m.geometry);m.geometry.computeBoundingSphere();assert(Number.isFinite(m.geometry.boundingSphere!.radius));assert(m.geometry.attributes.position.count>0);assert.equal(m.geometry.attributes.normal.count,m.geometry.attributes.position.count);m.geometry.dispose();(m.material as THREE.Material).dispose();}
});
