import * as THREE from 'three';
import {COVER_EXHIBITS,coverWalls,wallHeight} from './world.js';
import type {MuseumPalette} from './museum-materials.js';
import {createBoxContactShadow} from './contact-shadow.js';
const wx=(x:number)=>(x-400)*.05,wz=(y:number)=>(y-300)*.05;
/** Opaque visible meshes themselves are the selection/camera occluders. */
export function createMuseumCover(scene:THREE.Scene,p:MuseumPalette){
 const solids=coverWalls(),occluders:THREE.Mesh[]=[];
 for(const w of solids){
  const material=w.id.startsWith('cover_gem')?p.navy:w.id.startsWith('cover_history')?p.oak:p.stone;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w.width*.05,wallHeight(w),w.height*.05),material);
  mesh.name=w.id;mesh.position.set(wx(w.x+w.width/2),wallHeight(w)/2,wz(w.y+w.height/2));mesh.updateMatrixWorld(true);scene.add(mesh);occluders.push(mesh);
 }
 const box=(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o;};
 function plaque(text:string,x:number,y:number,z:number,width:number,rotation=0){
  if(typeof document==='undefined')return;
  const c=document.createElement('canvas');c.width=512;c.height=96;const a=c.getContext('2d')!;a.fillStyle='#e0d5bc';a.fillRect(0,0,512,96);a.fillStyle='#534b39';a.font='28px serif';a.textAlign='center';a.textBaseline='middle';a.fillText(text,256,48,480);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(width,width*96/512),new THREE.MeshStandardMaterial({map:t,roughness:1}));o.position.set(x,y,z);o.rotation.y=rotation;scene.add(o);
 }
 for(const e of COVER_EXHIBITS){
  const x=wx(e.x+e.width/2),z=wz(e.y+e.height/2),W=e.width*.05,D=e.height*.05;
  if(typeof document!=='undefined'){const shade=createBoxContactShadow(W,D,.25);shade.position.x=x;shade.position.z=z;scene.add(shade);}
  if(e.kind==='partition'){
   // Brass lines stay on the solid faces; no second coplanar face.
   for(const side of [-1,1]){for(const y of [.22,2.57])box(.018,.035,D-.18,p.brass,x+side*(W/2+.01),y,z);plaque('LIGHT & MINERAL',x+side*(W/2+.02),1.65,z,2.25,side*Math.PI/2);}
   // Mounted mineral diagram insets give the partition a museum purpose.
   for(const side of [-1,1])for(let i=0;i<3;i++){const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.22+i*.025),p.brass);gem.scale.x=.16;gem.position.set(x+side*(W/2+.025),1.05,z+(i-1)*.6);scene.add(gem);}
  }else if(e.kind==='sculpture'){
   // Stepped solid stone blades are the sculpture, rather than a giant display base.
   for(let i=0;i<3;i++){const w=solids.find(w=>w.id==='cover_sculpture_blade_'+i)!;for(const side of [-1,1])box(w.width*.05-.13,.035,.018,p.bronze,wx(w.x+w.width/2),1.2+i*.42,wz(side<0?w.y:w.y+w.height)+side*.012);}
   plaque('FOLDED STRATA · CARVED STONE',x,.18,z+D/2+.014,2.0);
  }else{
   // Opaque oak back/end panels match the shared blockers. Front and roof are clear glass.
   const front=wz(e.y+e.height)-.015,base=.85,top=e.elevation;
   const glass=new THREE.Mesh(new THREE.PlaneGeometry(W-.32,top-base-.12),p.glass);glass.position.set(x,(base+top)/2,front);scene.add(glass);
   const lid=new THREE.Mesh(new THREE.PlaneGeometry(W-.32,D-.23),p.glass);lid.rotation.x=-Math.PI/2;lid.position.set(x,top-.045,z+.05);scene.add(lid);
   for(let i=0;i<3;i++){const urn=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.18,0],[.24,.25],[.18,.48],[.09,.56],[.1,.67]].map(([r,h])=>new THREE.Vector2(r,h)),18),i===1?p.terra:p.limestone);urn.position.set(x+(i-1)*.65,base+.035,z+.15);scene.add(urn);}
   plaque('TRAVEL & EXCHANGE',x,.46,z+D/2+.014,W-.3);
  }
 }
 return {occluders};
}
