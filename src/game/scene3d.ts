import {activeTreasures} from './modes.js';
import {TOUR_MEETING,tourActive} from './tour-shared.js';
import * as THREE from 'three';
import {createMuseumPalette,limestoneFloor} from './museum-materials.js';
import {createDaylightRoof} from './daylight-roof.js';
import {createBoxContactShadow} from './contact-shadow.js';
import {createMuseumCover} from './museum-cover.js';
import {createArchitecture} from './architecture.js';
import {createFinishedRooms} from './finished-rooms.js';
import {createGemGallery} from './gem-gallery.js';
import {createPaintingTexture} from './textures.js';
import {CAMERAS,cameraTarget,cameraIsLive} from './cameras.js';
import {defaultWalls,defaultMovables,defaultLamps,defaultTreasures,defaultSwitches,ROOMS,PAINTINGS,wallHeight,ESCAPE,HOLDING} from './world.js';
import type {ClientGameState,Wall} from '../types/game.js';
export interface CameraPreset {id:string;name:string;position:THREE.Vector3;target:THREE.Vector3;}
export interface MuseumSceneContext {scene:THREE.Scene;occluderMeshes:THREE.Mesh[];cameraPresets:CameraPreset[];update:(dt:number,state:ClientGameState)=>void;dispose:()=>void;}
const wx=(x:number)=>(x-400)*.05,wz=(y:number)=>(y-300)*.05;
export function buildMuseumScene():MuseumSceneContext {
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xddebf2);scene.fog=new THREE.Fog(0xddebf2,145,220);
 const occluderMeshes:THREE.Mesh[]=[];
 const palette=createMuseumPalette();
 scene.add(new THREE.HemisphereLight(0xeef3f5,0xb2a58c,1.65));
 const sun=new THREE.DirectionalLight(0xfff2dc,1.9);sun.position.set(5,12,8);scene.add(sun);
 const cream=palette.plaster,marble=palette.limestone,brass=palette.brass,red=new THREE.MeshStandardMaterial({color:0x802c3b,roughness:.98}),wood=palette.oak;
 function box(w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number,occludes=false) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);scene.add(mesh);if(occludes)occluderMeshes.push(mesh);return mesh;
 }
 for(const room of ROOMS){const floor=new THREE.Mesh(new THREE.PlaneGeometry(room.width*.05,room.height*.05),limestoneFloor(room.width*.05,room.height*.05));floor.rotation.x=-Math.PI/2;floor.position.set(wx(room.x+room.width/2),0,wz(room.y+room.height/2));scene.add(floor);}
 const disposeRoof=createDaylightRoof(scene,palette,occluderMeshes);
 const architecture=createArchitecture(scene,palette);occluderMeshes.push(...architecture.occluders);
 const gemGallery=createGemGallery(scene,palette);
 const finished=createFinishedRooms(scene,palette);
 occluderMeshes.push(...createMuseumCover(scene,palette).occluders);
 const themes=['nocturne','portrait','sapphire','monolith'] as const;
 for(const [i,{x}] of PAINTINGS.entries()){
  const tex=createPaintingTexture(themes[i%4]);box(4.5,2.8,.15,brass,wx(x),2.5,wz(3));
  const painting=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.5),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));painting.position.set(wx(x),2.5,wz(6));scene.add(painting);
 }
 function railing(w:Wall) {
  const horizontal=w.width>w.height;
  const x1=wx(w.x+(horizontal?0:w.width/2)),z1=wz(w.y+(horizontal?w.height/2:0));
  const x2=wx(w.x+(horizontal?w.width:w.width/2)),z2=wz(w.y+(horizontal?w.height/2:w.height));
  const points=[new THREE.Vector3(x1,0,z1),new THREE.Vector3(x2,0,z2)];
  for(const p of points) {
   const stem=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.05,10),brass);stem.position.set(p.x,.55,p.z);scene.add(stem);
   const base=new THREE.Mesh(new THREE.CylinderGeometry(.33,.35,.08,12),brass);base.position.set(p.x,.04,p.z);scene.add(base);
   const top=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),brass);top.position.set(p.x,1.12,p.z);scene.add(top);
  }
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x1,1,z1),new THREE.Vector3((x1+x2)/2,.68,(z1+z2)/2),new THREE.Vector3(x2,1,z2));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,18,.045,8,false),red));
 }
 for(const w of defaultWalls()) {
  if(w.id.startsWith('cover_'))continue;
  if(w.type==='railing'){railing(w);continue;}
  if(['case_gem_a','case_gem_b','pedestal_gem'].includes(w.id)){occluderMeshes.push(gemGallery.display(w,w.id==='pedestal_gem'));continue;}
  const finishedWall=finished.wall(w);if(finishedWall){occluderMeshes.push(finishedWall);continue;}
  const h=wallHeight(w),mat=w.id==='entrance_door'?new THREE.MeshStandardMaterial({color:0x577a89,roughness:.9}):w.id.startsWith('bench')?wood:w.id.startsWith('pedestal')||w.id.startsWith('pillar')?marble:cream;
  box(w.width*.05,h,w.height*.05,mat,wx(w.x+w.width/2),h/2,wz(w.y+w.height/2),true);
 }
 // Soft wall/floor junctions, independent of the interactive lamp/shadow.
 for(const w of defaultWalls().filter(w=>!w.id.startsWith('cover_')&&w.type!=='railing'&&wallHeight(w)>=2.7&&(w.width<=16||w.height<=16))){const shade=createBoxContactShadow(w.width*.05,w.height*.05,.13);shade.position.x=wx(w.x+w.width/2);shade.position.z=wz(w.y+w.height/2);scene.add(shade);}
 // Three focused display lights; no extra real-time shadow maps or competing
 // gameplay shadows. The active gameplay lamps remain server-selected.
 for(const target of defaultTreasures()){
  const room=ROOMS.find(r=>r.name===target.room)!,h=room.ceiling-.22,x=wx(target.x)-1.2,z=wz(target.y)-.8;
  const light=new THREE.SpotLight(0xffefd8,22,11,Math.PI/7,.75,2);light.position.set(x,h,z);light.target.position.set(wx(target.x),1.5,wz(target.y));light.castShadow=false;scene.add(light,light.target);
  const housing=new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.16,12),palette.darkMetal);housing.position.set(x,h+.04,z);scene.add(housing);
 }
 const propContacts=new Map<string,THREE.Mesh>();
 const propMeshes=new Map<string,THREE.Mesh>();
 for(const prop of defaultMovables()) {
  const mesh=box(prop.width*.05,2.1,prop.height*.05,new THREE.MeshStandardMaterial({color:0x98a9a4,roughness:.92}),wx(prop.x+prop.width/2),1.05,wz(prop.y+prop.height/2),true);propMeshes.set(prop.id,mesh);
  propContacts.set(prop.id,gemGallery.contact(wx(prop.x+prop.width/2),wz(prop.y+prop.height/2),prop.width*.05,prop.height*.05));finished.movable(mesh,prop.id,prop.width*.05,prop.height*.05);
  if(prop.id==='display_gem'){mesh.material=gemGallery.blue;for(const y of [-.88,.88]){const trim=new THREE.Mesh(new THREE.BoxGeometry(prop.width*.05+.018,.06,prop.height*.05+.018),gemGallery.brass);trim.position.y=y;mesh.add(trim);}const art=new THREE.Mesh(new THREE.OctahedronGeometry(.42),new THREE.MeshStandardMaterial({color:0x93b5a0,roughness:.65}));art.position.y=.25;mesh.add(art);}
  // Abstract art on the movable block; small enough to stay in the solid volume.
 }
 const tourMarker=new THREE.Group();tourMarker.position.set(wx(TOUR_MEETING.x),0,wz(TOUR_MEETING.y));tourMarker.visible=false;
 const tourMaterial=new THREE.MeshBasicMaterial({color:0x1cc5d6,transparent:true,opacity:.8,depthWrite:false});
 const tourRing=new THREE.Mesh(new THREE.RingGeometry(1.9,2.05,48),tourMaterial);tourRing.rotation.x=-Math.PI/2;tourRing.position.y=.045;tourMarker.add(tourRing);
 const tourArrow=new THREE.Mesh(new THREE.ConeGeometry(.3,.55,4),tourMaterial);tourArrow.rotation.z=Math.PI;tourArrow.position.y=.8;tourMarker.add(tourArrow);scene.add(tourMarker);
 const lampContacts=new Map<string,THREE.Mesh>();
 const lamps=new Map<string,{group:THREE.Group;light:THREE.PointLight;ring:THREE.Mesh}>();
 for(const l of defaultLamps()) {
  lampContacts.set(l.id,gemGallery.contact(wx(l.x),wz(l.y),1.6,1.6,false));
  const group=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,.2,16),brass);base.position.y=.1;group.add(base);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,2.3,12),brass);post.position.y=1.2;group.add(post);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),new THREE.MeshStandardMaterial({color:0xffebaa,emissive:0xffdb87,emissiveIntensity:1.5}));bulb.position.y=2.5;group.add(bulb);
  const light=new THREE.PointLight(0xffd78e,2.2,18,1.2);light.position.y=2.5;group.add(light);group.position.set(wx(l.x),0,wz(l.y));const ring=new THREE.Mesh(new THREE.TorusGeometry(.79,.045,6,40),new THREE.MeshBasicMaterial({color:0x55dfb0,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.045;ring.visible=false;group.add(ring);scene.add(group);lamps.set(l.id,{group,light,ring});
 }
 const gems=new Map<string,THREE.Mesh>();
 for(const [i,t] of defaultTreasures().entries()) {
  const gem=finished.treasure(t)||new THREE.Mesh(new THREE.OctahedronGeometry(.38,0),new THREE.MeshStandardMaterial({color:0x298bc7,emissive:0x298bc7,emissiveIntensity:.6,roughness:.3,metalness:.2}));gem.position.set(wx(t.x),1.73,wz(t.y));if(!gem.parent)scene.add(gem);gems.set(t.id,gem);
 }

 const switchMeshes=new Map<string,THREE.Mesh>();
 const switchRings=new Map<string,THREE.Mesh>();
 for(const sw of defaultSwitches()) {
  const color=sw.kind==='rescue'?0x9775d9:0xeaa44c;
  const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25,roughness:.7});
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.65,.7,.12,24),mat);mesh.position.set(wx(sw.x),.08,wz(sw.y));scene.add(mesh);switchMeshes.set(sw.id,mesh);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,32),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(wx(sw.x),.015,wz(sw.y));scene.add(ring);switchRings.set(sw.id,ring);

 }
 const exitMat=new THREE.MeshBasicMaterial({color:0x83c4a1,transparent:true,opacity:.25,side:THREE.DoubleSide});
 const exit=new THREE.Mesh(new THREE.PlaneGeometry(ESCAPE.width*.05,ESCAPE.height*.05),exitMat);exit.rotation.x=-Math.PI/2;exit.position.set(wx(ESCAPE.x+ESCAPE.width/2),.012,wz(ESCAPE.y+ESCAPE.height/2));scene.add(exit);

 const cameraPresets=CAMERAS.map(c=>({id:c.id,name:c.name,position:new THREE.Vector3().fromArray(c.position),target:new THREE.Vector3().fromArray(c.target)}));
 const cameraHardware=new Map<string,{pivot:THREE.Group;orientation:THREE.Object3D;led:THREE.MeshBasicMaterial;sign:THREE.Sprite;live:THREE.Texture;idle:THREE.Texture}>();
 function cameraSign(text:string,live:boolean) {
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=96;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle=live?'#e91e35':'#303940';ctx.fillRect(0,0,320,96);
  ctx.strokeStyle=live?'#ff8390':'#69747b';ctx.lineWidth=5;ctx.strokeRect(3,3,314,90);
  ctx.fillStyle=live?'#ffffff':'#b7c0c5';ctx.font='bold 55px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,160,50,300);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }
 for(const cam of cameraPresets) {
  // Pivot is the fixed optical mount. All housing/lens geometry stays BEHIND that origin at every pan.
  const pivot=new THREE.Group();pivot.name='security-camera-'+cam.id;pivot.position.copy(cam.position);pivot.lookAt(cam.target);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.52,.3,.65),new THREE.MeshStandardMaterial({color:0x384047,roughness:.8}));body.position.z=-.75;pivot.add(body);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.18,12),new THREE.MeshStandardMaterial({color:0x182028}));lens.rotation.x=Math.PI/2;lens.position.z=-.36;pivot.add(lens);
  const led=new THREE.MeshBasicMaterial({color:0x40464b,toneMapped:false});
  for(const x of [-.30,.30]){const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),led);bulb.position.set(x,.08,-.60);pivot.add(bulb);}
  const live=cameraSign('● LIVE '+cam.id.slice(-2),true),idle=cameraSign('CAM '+cam.id.slice(-2),false);
  const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:idle,depthTest:true,toneMapped:false}));sign.name='camera-status-'+cam.id;const direction=cam.target.clone().sub(cam.position).normalize();
  sign.position.set(1,(.35+.75*direction.y)/Math.hypot(direction.x,direction.z),-.75);sign.scale.set(1.65,.495,1);pivot.add(sign);
  const bracket=cam.position.clone().addScaledVector(cam.position.clone().sub(cam.target).normalize(),.75);
  const mountRoom=ROOMS.find(r=>cam.position.x/.05+400>=r.x&&cam.position.x/.05+400<=r.x+r.width&&cam.position.z/.05+300>=r.y&&cam.position.z/.05+300<=r.y+r.height)!;
  if(cam.id==='cam_01'){
   // Low wall mount keeps the physical head and LIVE plate readable below the
   // tall atrium ceiling; all support geometry stays beside/behind the optic.
   const wallX=wx(934);box(wallX-bracket.x,.1,.1,brass,(wallX+bracket.x)/2,bracket.y,bracket.z);box(.08,.45,.3,brass,wallX-.04,bracket.y,bracket.z);
  }else box(.12,Math.max(.3,mountRoom.ceiling-cam.position.y),.12,brass,bracket.x,(mountRoom.ceiling+cam.position.y)/2,bracket.z);
  scene.add(pivot);const orientation=new THREE.Object3D();orientation.position.copy(cam.position);
  cameraHardware.set(cam.id,{pivot,orientation,led,sign,live,idle});
 }
 let time=0;
 function update(dt:number,state:ClientGameState) {
  time+=dt;
  tourMarker.visible=state.status==='playing'&&tourActive(state.tour);tourArrow.position.y=.8+Math.sin(time*3)*.1;
  for(const [id,hardware] of cameraHardware) {
   hardware.orientation.lookAt(cameraTarget(id,state.guard.cameraPans[id]||0));
   hardware.pivot.quaternion.slerp(hardware.orientation.quaternion,Math.min(1,dt*14));
   const live=cameraIsLive(state,id);
   hardware.led.color.setHex(live?0xff2038:0x40464b);
   const mat=hardware.sign.material as THREE.SpriteMaterial;mat.map=live?hardware.live:hardware.idle;
  }
  for(const l of state.lamps){const contact=lampContacts.get(l.id);if(contact){contact.position.x=wx(l.x);contact.position.z=wz(l.y);contact.visible=true;}const obj=lamps.get(l.id);if(obj){obj.group.position.set(wx(l.x),0,wz(l.y));const mine=state.myRole==='thief'&&l.holderId===state.myId;obj.ring.visible=mine;(obj.ring.material as THREE.MeshBasicMaterial).color.setHex(state.players.find(p=>p.isSelf)?.carryBlocked?0xffb44b:0x55dfb0);}}
  if(typeof window!=='undefined')(window as any).__lampDiagnostics=[...lamps].map(([id,o])=>({id,x:o.group.position.x/.05+400,y:o.group.position.z/.05+300,highlighted:o.ring.visible}));
  for(const p of state.movables){const contact=propContacts.get(p.id);if(contact){contact.position.x=wx(p.x+p.width/2);contact.position.z=wz(p.y+p.height/2);contact.visible=true;}const obj=propMeshes.get(p.id);if(obj)obj.position.set(wx(p.x+p.width/2),1.05,wz(p.y+p.height/2));}
  for(const t of state.treasures){const gem=gems.get(t.id);if(gem){gem.visible=!t.stolen;gem.rotation.y=t.id==='treasure_gem'?.3:time*.15;gem.position.y=1.73;}}
  for(const [id,mesh] of switchMeshes){mesh.visible=state.switches.some(sw=>sw.id===id);if(switchRings.get(id))switchRings.get(id)!.visible=mesh.visible;}
  for(const sw of state.switches){const mesh=switchMeshes.get(sw.id);if(mesh){const mat=mesh.material as THREE.MeshStandardMaterial;mat.emissiveIntensity=sw.cooldown>0?0:.35;mat.color.setHex(sw.cooldown>0?0x777777:sw.kind==='rescue'?0x9775d9:0xeaa44c);}}
  exitMat.opacity=activeTreasures(state.treasures).every(t=>t.stolen)?.55:.18;
 }
 function dispose() {
  const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>(),tex=new Set<THREE.Texture>();
  scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Sprite){if(obj instanceof THREE.Mesh)geos.add(obj.geometry);for(const m of Array.isArray(obj.material)?obj.material:[obj.material]){mats.add(m);const map=(m as THREE.MeshStandardMaterial).map;if(map)tex.add(map);}}});
  occluderMeshes.forEach(mesh=>geos.add(mesh.geometry));
  cameraHardware.forEach(h=>{h.live.dispose();h.idle.dispose();});
  palette.materials.forEach(m=>mats.add(m));geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());tex.forEach(t=>t.dispose());palette.disposeTextures();disposeRoof();
 }
 return {scene,occluderMeshes,cameraPresets,update,dispose};
}
