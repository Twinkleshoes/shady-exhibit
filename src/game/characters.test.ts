import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {APPEARANCES} from './appearances.js';
import {createVisitorRig} from './visitor-rig.js';
import {shadowOutline} from './shadow3d.js';
import {newRoom,newPlayer,startRound,stepRoom,clientState,admire,capture,lobby} from './engine.js';
import {visitorLabelVisible} from './visitor-labels.js';
function room(){const r=newRoom('AVATAR','p0');for(let i=0;i<4;i++){r.players['p'+i]=newPlayer('p'+i,'Person '+i);if(i)r.playerOrder.push('p'+i);}startRound(r);return r;}
test('Shared appearance pool contains twelve distinct outfits, varied hair/skin and optional hats',()=>{assert.equal(APPEARANCES.length,12);assert.equal(new Set(APPEARANCES.map(a=>JSON.stringify(a))).size,12);assert(new Set(APPEARANCES.map(a=>a.skin)).size>=6);assert.equal(new Set(APPEARANCES.map(a=>a.hairStyle)).size,4);assert(new Set(APPEARANCES.map(a=>a.style)).size>=3);assert(APPEARANCES.some(a=>a.bag)&&APPEARANCES.some(a=>!a.hat));});
test('Every locally built model has weighted skeleton, valid bounds and seven or fewer material batches',()=>{for(let id=0;id<12;id++){const r=createVisitorRig(id);assert(r.mesh instanceof THREE.SkinnedMesh);assert.equal(r.mesh.skeleton.bones.length,15);assert(r.mesh.geometry.groups.length<=7);const weights=r.mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-6);r.mesh.geometry.computeBoundingBox();const box=r.mesh.geometry.boundingBox!;assert(box.min.y>=0&&box.max.y<2.1);assert(box.max.x-box.min.x<.9);r.dispose();}});
test('All floor visitors use the same pool, keep looks during movement, and publish identical appearance/action to each entitled client',()=>{const r=room(),floor=[...Object.values(r.players).filter(p=>p.role==='thief'),...r.visitors];assert.equal(new Set(floor.map(p=>p.appearanceId)).size,12);const original=floor.map(p=>p.appearanceId);for(let i=0;i<20;i++)stepRoom(r,.05);assert.deepEqual(floor.map(p=>p.appearanceId),original);const states=r.playerOrder.map(id=>clientState(r,id));for(const state of states)for(const p of state.players){const server=floor.find(v=>v.badgeNumber===p.badgeNumber)!;assert.equal(p.appearanceId,server.appearanceId);assert.equal(p.action,server.action);}const guard=states.find(s=>s.myRole==='guard')!;assert(guard.players.every(p=>!p.isTeammate&&!p.name.startsWith('Person')));});
test('Player admire uses NPC action, cancels on movement, cannot free captures and resets on lobby/replay',()=>{const r=room(),p=Object.values(r.players).find(p=>p.role==='thief')!,g=Object.values(r.players).find(p=>p.role==='guard')!;assert(!admire(r,g));assert(admire(r,p));stepRoom(r,.05);assert.equal(p.action,'admire');assert(r.visitors.some(v=>v.action==='admire'));p.input={dx:1,dy:0,at:100};stepRoom(r,.05,100);assert.equal(p.action,'walk');assert.equal(p.admireUntil,0);admire(r,p);capture(r,p);assert(!admire(r,p));assert.equal(p.action,'captured');lobby(r);assert.equal(p.action,'idle');startRound(r);assert.equal(p.admireUntil,0);});
test('Reaching silhouette has separate head/legs/hand and its furthest middle fingertip stays at the authoritative endpoint',()=>{for(const L of [1.5,3,8.75])for(let id=0;id<12;id++){const p=shadowOutline(L,id);assert(p.length>35);assert(p.some(v=>v.x===0&&v.y===L));assert(Math.max(...p.map(v=>v.y))<=L);assert(p.some(v=>v.x<0)&&p.some(v=>v.x>0));}});
test('Visitor labels stay in the camera frustum and are hidden by actual exhibit/wall meshes',()=>{const c=new THREE.PerspectiveCamera(60,1.5,.1,100);c.position.set(0,3,6);c.lookAt(0,1,0);c.updateMatrixWorld();assert(visitorLabelVisible(c,0,0,[]));const wall=new THREE.Mesh(new THREE.BoxGeometry(4,5,.4));wall.position.set(0,2.5,3);wall.updateMatrixWorld();assert(!visitorLabelVisible(c,0,0,[wall]));assert(!visitorLabelVisible(c,30,0,[]));wall.geometry.dispose();(wall.material as THREE.Material).dispose();});

test('Organic body and each hairstyle are continuous surfaces with blended joint weights and smooth normals',()=>{
 for(let id=0;id<12;id++){
  const r=createVisitorRig(id),g=r.mesh.geometry,p=g.attributes.position,n=g.attributes.normal,tag=g.attributes.surfacePart,w=g.attributes.skinWeight;
  assert(!(r.mesh.material as THREE.MeshStandardMaterial).flatShading);assert(g.index);assert(p.count<10000,'indexed vertex budget');assert(g.index.count/3<17000,'triangle budget');
  let blended=0;for(let i=0;i<p.count;i++){if(w.getY(i)>0&&w.getX(i)>0)blended++;const len=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));assert(len>.95&&len<1.05,'normal length');}assert(blended>500);
  for(const part of [1,2]){
   const parent=new Map<string,string>(),key=(i:number)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e4)).join(','),find=(s:string):string=>{const q=parent.get(s)!;if(q===s)return s;const root=find(q);parent.set(s,root);return root;};
   for(let i=0;i<p.count;i++)if(tag.getX(i)===part){const k=key(i);parent.set(k,k);}
   for(let i=0;i<g.index.count;i+=3){const a=g.index.getX(i),b=g.index.getX(i+1),c=g.index.getX(i+2);if(tag.getX(a)!==part)continue;for(const v of [b,c]){const ka=find(key(a)),kb=find(key(v));if(ka!==kb)parent.set(kb,ka);}}
   assert.equal(new Set([...parent.keys()].map(find)).size,1,'connected surface '+id+'/'+part);
  }
  r.dispose();
 }
});
test('Admire and walking bends do not tear the organic mesh into stretched joint/hip webs',()=>{
 for(const id of [0,1,2,3,11]){
  const r=createVisitorRig(id),m=r.mesh,g=m.geometry,p=g.attributes.position,b=r.bones;
  for(const mode of ['admire','walk']){
   for(const bone of m.skeleton.bones)bone.rotation.set(0,0,0);
   for(const side of [-1,1]){const name=side<0?'left':'right';b[name+'Arm'].rotation.set(mode==='admire'?-.22:side*.38,0,side*.16);b[name+'Forearm'].rotation.x=mode==='admire'?-.12-(side<0?.55:.85):-.12;if(mode==='walk'){b[name+'Thigh'].rotation.x=side*.65;b[name+'Shin'].rotation.x=side<0?1.1:.2;b[name+'Foot'].rotation.x=-b[name+'Thigh'].rotation.x-b[name+'Shin'].rotation.x;}}
   m.updateMatrixWorld(true);m.skeleton.update();const rest:THREE.Vector3[]=[],pose:THREE.Vector3[]=[];
   for(let i=0;i<p.count;i++){rest.push(new THREE.Vector3().fromBufferAttribute(p,i));pose.push(m.applyBoneTransform(i,rest[i].clone()));assert(Number.isFinite(pose[i].length()));}
   for(let j=0;j<g.index!.count;j+=3)for(const [aa,bb]of [[0,1],[1,2],[2,0]]){const a=g.index!.getX(j+aa),b=g.index!.getX(j+bb);if(g.attributes.surfacePart.getX(a)!==1)continue;const d=rest[a].distanceTo(rest[b]),e=pose[a].distanceTo(pose[b]);assert(!(d>.003&&e>.08&&e/d>4),'stretched skin edge '+id+'/'+mode+'/'+e);}
  }
  r.dispose();
 }
});
