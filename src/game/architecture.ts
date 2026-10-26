import * as THREE from 'three';
import {createMuseumPalette,type MuseumPalette} from './museum-materials.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROOMS,DOORWAYS} from './world.js';
const wx=(x:number)=>(x-400)*.05,wz=(y:number)=>(y-300)*.05;
/** Architectural detail lives on existing jambs, walls and overhead. No decorative
 * solid crosses a playable route. All floor-standing exhibits live in world.ts. */
export function createArchitecture(scene:THREE.Scene,palette:MuseumPalette=createMuseumPalette()){
 const cream=palette.trim,trim=palette.brass,terra=palette.terra,sage=palette.sage,blue=palette.navy;
 const groups=new Map<THREE.Material,THREE.BufferGeometry[]>(),occluders:THREE.Mesh[]=[];
 function add(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,ry=0,occludes=false){
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(1,1,1));g.applyMatrix4(matrix);if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}if(occludes){const proxy=new THREE.Mesh(g.clone(),m);proxy.updateMatrixWorld(true);occluders.push(proxy);}const batch=groups.get(m)||[];batch.push(g);groups.set(m,batch);
 }
 function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,ry=0,occludes=false){add(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry,occludes);}
 // Repeated jamb orders define broad, generous passages. The arch sits above
 // 4.4m clearance, well above visitors and the following third-person camera.
 for(const door of DOORWAYS){
  const acrossX=door.id.startsWith('gem-')&&!door.id.includes('-bay');
  const ry=acrossX?0:Math.PI/2,x=wx(door.x),z=wz(door.y);
  for(const side of [-1,1]){
   const dx=acrossX?side*3.8:0,dz=acrossX?0:side*3.8;
   box(.35,4.55,.52,cream,x+dx,2.275,z+dz,ry);
   box(.42,.18,.58,trim,x+dx,.15,z+dz,ry);
   box(.46,.16,.64,trim,x+dx,4.5,z+dz,ry);
  }
  box(8.04,.24,.6,cream,x,4.69,z,ry,true);
  // Segmental arch relief is entirely above the doorway lintel.
  const path=new THREE.Shape();path.absarc(0,0,3.9,0,Math.PI,false);path.absarc(0,0,3.68,Math.PI,0,true);
  const arch=new THREE.ExtrudeGeometry(path,{depth:.16,bevelEnabled:false,curveSegments:20});
  const scale=new THREE.Matrix4().makeScale(1,.18,1);arch.applyMatrix4(scale);add(arch,trim,x,4.81,z-.08,ry,true);
 }
 // Tall atrium drum: cream pilasters stay against the existing wall faces.
 for(const x of [467,933])for(const y of [510,640,845,1190]){
  box(.12,7.9,.42,cream,wx(x),3.95,wz(y));box(.18,.15,.6,trim,wx(x),7.85,wz(y));
 }
 for(const x of [467,933]){box(.16,.18,36.5,cream,wx(x),7.7,wz(830));box(.08,.06,36.5,trim,wx(x),6.9,wz(830));}
 // The tall hall is enclosed above the lower gallery roofs. The northern
 // transom and southern entrance portal close the high wall band, preserving
 // daylight through a frosted clerestory rather than a gap to the outside.
 box(7.4,2.6,.6,cream,wx(700),6.9,wz(460),0,true);
 box(7.2,.65,.08,new THREE.MeshBasicMaterial({color:0xd9e8e9}),wx(700),5.25,wz(467));
 box(24,3.3,.4,cream,wx(700),6.55,wz(1200),0,true);
 // Distinct ceiling coffers stop the long gallery reads; warm sculpture beams,
 // close sage archive bays, and a compact navy mineral salon.
 for(const room of ROOMS.filter(r=>r.id!=='atrium'&&r.id!=='south')){
  const accent=room.id.startsWith('sculpture')?terra:room.id.startsWith('history')?sage:blue;
  const y=room.ceiling-.16,x=wx(room.x+room.width/2),z=wz(room.y+room.height/2);
  box(room.width*.05,.16,.12,accent,x,y,wz(room.y+14));
  box(room.width*.05,.16,.12,accent,x,y,wz(room.y+room.height-14));
  // Floor borders sit above the floor, below all contact/interactive shadows.
  const floorMat=trim;
  for(const edge of [room.x+8,room.x+room.width-8])box(.055,.006,room.height*.05-.8,floorMat,wx(edge),.004,z);
  for(const edge of [room.y+8,room.y+room.height-8])box(room.width*.05-.8,.006,.055,floorMat,x,.004,wz(edge));
 }
 // Intentional backdrop to the northern sculpture landmark and archive intro.
 for(const x of [55,225])box(.22,4.8,.18,cream,wx(x),2.4,wz(2));
 box(8.2,3.6,.05,terra,wx(140),2.6,wz(1));
 box(8,3.2,.05,sage,wx(1275),2.4,wz(1));
 // Batch the static architectural ornament by material rather than adding
 // hundreds of draw calls; untextured reusable materials, no remote assets.
 for(const [material,parts]of groups){const merged=mergeGeometries(parts)!;for(const p of parts)p.dispose();const mesh=new THREE.Mesh(merged,material);mesh.name='museum-architecture-batch';scene.add(mesh);}
 return {occluders};
}
