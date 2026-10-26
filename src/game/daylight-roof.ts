import * as THREE from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROOMS} from './world.js';import type {MuseumPalette} from './museum-materials.js';
const wx=(x:number)=>(x-400)*.05,wz=(y:number)=>(y-300)*.05;
/** Actual roof openings, recessed reveals and upper glazing. All overhead solids
 * are also third-person camera raycast geometry; they sit above every CCTV. */
export function createDaylightRoof(scene:THREE.Scene,p:MuseumPalette,occluders:THREE.Mesh[]){
 const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number){if(w<=0||d<=0)return;const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);const proxy=new THREE.Mesh(g.clone(),m);proxy.updateMatrixWorld(true);occluders.push(proxy);const list=batches.get(m)||[];list.push(g);batches.set(m,list);}
 const c=document.createElement('canvas');c.width=c.height=128;const a=c.getContext('2d')!,g=a.createLinearGradient(0,0,128,128);g.addColorStop(0,'#b3cbd7');g.addColorStop(.55,'#d5e4e8');g.addColorStop(1,'#c2d8df');a.fillStyle=g;a.fillRect(0,0,128,128);const sky=new THREE.CanvasTexture(c);sky.colorSpace=THREE.SRGBColorSpace;const glazing=new THREE.MeshBasicMaterial({map:sky,color:0xe0edf0,toneMapped:false});
 for(const r of ROOMS){
  const x=wx(r.x+r.width/2),z=wz(r.y+r.height/2),W=r.width*.05,D=r.height*.05,H=r.ceiling;
  const sw=r.id==='atrium'?15:r.id==='gem'?13:Math.min(W-3,9),sd=r.id==='atrium'?15:r.id==='sculpture'?20:r.id==='history'?14:r.id==='gem'?7:Math.min(D-3,8);
  const cz=r.id==='atrium'?wz(770):z,cx=r.id==='atrium'?wx(700):x;
  const left=cx-sw/2,right=cx+sw/2,north=cz-sd/2,south=cz+sd/2,x0=x-W/2,z0=z-D/2;
  box(left-x0,.16,D,p.ceiling,(x0+left)/2,H+.12,z);box(x0+W-right,.16,D,p.ceiling,(right+x0+W)/2,H+.12,z);
  box(sw,.16,north-z0,p.ceiling,cx,H+.12,(z0+north)/2);box(sw,.16,z0+D-south,p.ceiling,cx,H+.12,(south+z0+D)/2);
  for(const edge of [-1,1]){box(sw+.48,.18,.22,p.limestone,cx,H-.05,cz+edge*(sd/2+.11));box(.22,.18,sd+.04,p.limestone,cx+edge*(sw/2+.11),H-.05,cz);box(sw+.2,.5,.12,p.plaster,cx,H+.28,cz+edge*(sd/2+.04));box(.12,.5,sd,p.plaster,cx+edge*(sw/2+.04),H+.28,cz);}
  box(sw,.04,sd,glazing,cx,H+.56,cz);
  for(let xx=-sw/2+3;xx<sw/2-.1;xx+=3)box(.065,.09,sd,p.darkMetal,cx+xx,H+.49,cz);
  for(let zz=-sd/2+3;zz<sd/2-.1;zz+=3)box(sw,.09,.065,p.darkMetal,cx,H+.49,cz+zz);
 }
 for(const [material,parts]of batches){const geo=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geo,material);mesh.name='daylight-roof-batch';scene.add(mesh);}
 return ()=>sky.dispose();
}
