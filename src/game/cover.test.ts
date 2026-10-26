import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createMuseumCover} from './museum-cover.js';import {createMuseumPalette} from './museum-materials.js';
import {COVER_EXHIBITS,coverWalls,defaultWalls,defaultMovables,movableWalls,defaultTreasures,wallHeight} from './world.js';
import {CAMERAS,cameraTarget,visitorSightPoints,visibleOnCamera,visibleVisitorOnCamera} from './cameras.js';
import {newRoom,newPlayer,startRound,selectCamera,inspect,stepRoom,clientState,refreshShadows,sees} from './engine.js';
import {COVER_PROBES} from './cover-fixtures.js';import{findRoute,clearPath}from'./navigation.js';import{resolveWallCollisions}from'./physics.js';
function fixture(){const r=newRoom('COVER','0');r.playerOrder=['0','1','2','3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r);return r;}
test('Three cover exhibits render opaque solids with the exact shared collision/occlusion dimensions; glass is excluded',()=>{
 const scene=new THREE.Scene(),p=createMuseumPalette(),{occluders}=createMuseumCover(scene,p),walls=coverWalls();assert.equal(COVER_EXHIBITS.length,3);assert.equal(occluders.length,walls.length);
 for(const w of walls){const mesh=occluders.find(m=>m.name===w.id)!;assert(mesh);const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());assert(Math.abs(size.x-w.width*.05)<1e-5);assert(Math.abs(size.y-wallHeight(w))<1e-5);assert(Math.abs(size.z-w.height*.05)<1e-5);assert.equal((mesh.material as THREE.Material).transparent,false);assert(defaultWalls().some(v=>v.id===w.id));}
 const panes=scene.children.filter(o=>o instanceof THREE.Mesh&&(o.material as THREE.Material).transparent);assert.equal(panes.length,2);assert(panes.every(o=>!occluders.includes(o as THREE.Mesh)));
});
test('All six real camera lenses over every degree of pan agree with raycasts against the rendered cover solids',()=>{
 const scene=new THREE.Scene(),p=createMuseumPalette(),cover=createMuseumCover(scene,p).occluders,walls=[...defaultWalls(),...movableWalls(defaultMovables())];
 const occluders=[...cover,...walls.filter(w=>!w.id.startsWith('cover_')&&w.type!=='railing').map(w=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w.width*.05,wallHeight(w),w.height*.05),p.stone);m.position.set((w.x+w.width/2-400)*.05,wallHeight(w)/2,(w.y+w.height/2-300)*.05);m.updateMatrixWorld(true);return m;})];
 const targets=[...COVER_PROBES.flatMap(c=>[c.visible,c.hidden]),...defaultTreasures()];const ray=new THREE.Raycaster(),frustum=new THREE.Frustum();let checks=0;
 for(const c of CAMERAS)for(const aspect of [1.5,3])for(let degrees=-50;degrees<=50;degrees++){
  const pan=degrees*Math.PI/180,lens=new THREE.PerspectiveCamera(54,aspect,.1,220);lens.position.fromArray(c.position);lens.lookAt(cameraTarget(c.id,pan));lens.updateMatrixWorld();frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(lens.projectionMatrix,lens.matrixWorldInverse));
  for(const target of targets){const actual=visitorSightPoints(target,c.id).some(point=>{const v=new THREE.Vector3((point.x-400)*.05,point.elevation,(point.y-300)*.05);if(!frustum.containsPoint(v))return false;ray.set(lens.position,v.clone().sub(lens.position).normalize());ray.far=lens.position.distanceTo(v)-.05;return ray.intersectObjects(occluders,false).length===0;});assert.equal(visibleVisitorOnCamera(target,c.id,walls,aspect,pan),actual,c.id+' '+degrees+' '+JSON.stringify(target));checks++;}
 }assert.equal(checks,10908);
});
test('Each cover breaks a real inspection, removes the suspect from the roster and rejects stale inspection without refund',()=>{
 for(const probe of COVER_PROBES){const r=fixture(),p=Object.values(r.players).find(p=>p.role==='thief')!,guard=Object.values(r.players).find(p=>p.role==='guard')!;selectCamera(r,probe.cameraId,1.5);Object.assign(p,probe.visible);refreshShadows(r);assert(sees(r,p));assert(inspect(r,p.badgeNumber));assert.equal(r.guardCharges,2);Object.assign(p,probe.hidden);refreshShadows(r);assert(!sees(r,p));stepRoom(r,.05);assert.equal(r.activeInspection,null);assert.equal(r.guardCharges,2);assert(!p.isCaptured);assert(!clientState(r,guard.id).players.some(v=>v.badgeNumber===p.badgeNumber));assert(!inspect(r,p.badgeNumber));assert.equal(r.guardCharges,2);assert(visibleVisitorOnCamera(p,probe.cameraId,r.walls.filter(w=>!w.id.startsWith(probe.id))));assert(findRoute(probe.visible,probe.hidden,r.walls).length);}
});
test('Partial exposure stays observable when the head clears low cover',()=>{
 const r=fixture(),p=Object.values(r.players).find(p=>p.role==='thief')!;p.x=230;p.y=1000;r.walls.push({id:'test_low_cover',x:215,y:870,width:30,height:8,elevation:2});selectCamera(r,'cam_03',1.5);assert(!visibleOnCamera(p,'cam_03',r.walls,1.5,1.1));assert(visibleOnCamera(p,'cam_03',r.walls,1.5,1.8));assert(sees(r,p));assert(inspect(r,p.badgeNumber));
});
test('Cover bypasses admit visitors, lamps and carried displays; each treasure retains an observation angle',()=>{
 const w=[...defaultWalls(),...movableWalls(defaultMovables())],pairs=[[{x:800,y:370},{x:920,y:370}],[{x:240,y:750},{x:400,y:750}],[{x:1240,y:790},{x:1365,y:790}]];
 for(const [a,b]of pairs)for(const radius of [18,14,Math.hypot(20,25)]){assert(findRoute(a,b,w,radius).length,JSON.stringify({a,b,radius}));assert.deepEqual(resolveWallCollisions(a,radius,w),a);assert.deepEqual(resolveWallCollisions(b,radius,w),b);}
 for(const t of defaultTreasures())assert(CAMERAS.some(c=>Array.from({length:101},(_,i)=>(i-50)*Math.PI/180).some(pan=>visibleOnCamera(t,c.id,w,1.5,1.73,pan))),t.name);
});
