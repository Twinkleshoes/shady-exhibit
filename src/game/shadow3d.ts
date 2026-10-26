import * as THREE from 'three';
import type {ShadowData} from '../types/game.js';
import {appearanceFor} from './appearances.js';
export interface Shadow3DController{meshGroup:THREE.Group;update:(position:{x:number;z:number},shadow:ShadowData,touching:boolean,dt:number,appearanceId?:number,ordinary?:boolean)=>void;dispose:()=>void;}
/** One continuous humanoid outline. The middle fingertip and feedback ring are
 * exactly the authoritative hand coordinate; silhouettes never award a theft. */
export function shadowOutline(length:number,appearanceId=0){
 const w=Math.min(1,length/3),look=appearanceFor(appearanceId),hip=look.style==='skirt'?.34:.23,head=look.hairStyle==='bob'?.29:.25,L=length;
 const p=[
 [.06,.02],[.30,0],[.36,L*.08],[hip,L*.28],[.30,L*.40],[.55,L*.48],[.68,L*.64],[.13,L-.4*w],
 [.20,L-.27*w],[.24,L-.18*w],[.21,L-.09*w],[.15,L-.11*w],[.12,L-.035*w],[.07,L-.10*w],[0,L],[-.04,L-.09*w],[-.10,L-.035*w],[-.15,L-.13*w],[-.28,L-.18*w],[-.32,L-.25*w],[-.18,L-.34*w],[-.12,L-.4*w],
 [.40,L*.63],[.34,L*.51],[.22,L*.44],[.12,L*.47],[head,L*.50],[head,L*.55],[.18,L*.60],[0,L*.625],[-.18,L*.60],[-head,L*.55],[-head,L*.50],[-.12,L*.47],[-.30,L*.43],[-.48,L*.40],[-.60,L*.30],[-.47,L*.24],[-.33,L*.31],[-.31,L*.35],[-hip,L*.28],[-.36,L*.08],[-.30,0],[-.06,.02],[-.04,L*.18],[0,L*.25],[.04,L*.18],
 ];return p.map(([u,v])=>new THREE.Vector2(u*w,v));
}
function ordinaryOutline(L:number,appearanceId:number){
 const look=appearanceFor(appearanceId),w=Math.min(1,L/2),hip=look.style==='skirt'?.34:.22;
 return [[.06,0],[.3,0],[hip,L*.4],[.28,L*.62],[.42,L*.56],[.43,L*.4],[.54,L*.4],[.55,L*.6],[.33,L*.74],[.12,L*.76],[.23,L*.84],[.22,L*.94],[0,L],[-.22,L*.94],[-.23,L*.84],[-.12,L*.76],[-.33,L*.74],[-.55,L*.6],[-.54,L*.4],[-.43,L*.4],[-.42,L*.56],[-.28,L*.62],[-hip,L*.4],[-.3,0],[-.06,0],[0,L*.3]].map(([u,v])=>new THREE.Vector2(u*w,v));
}
export function createShadow3D():Shadow3DController{
 const meshGroup=new THREE.Group();meshGroup.name='interactive_shadow';
 const points=shadowOutline(5),geometry=new THREE.BufferGeometry();let positions=new Float32Array(points.length*3),lastOrdinary=false;
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(THREE.ShapeUtils.triangulateShape(points,[]).flat());
 const material=new THREE.MeshBasicMaterial({color:0x10131a,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide});
 const body=new THREE.Mesh(geometry,material);body.position.y=.02;body.frustumCulled=false;body.name='humanoid-shadow';meshGroup.add(body);
 const ringMaterial=new THREE.MeshBasicMaterial({color:0x55c3ee,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
 const ring=new THREE.Mesh(new THREE.RingGeometry(.18,.32,28),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.025;ring.name='authoritative-hand';meshGroup.add(ring);
 let time=0;
 return {meshGroup,update(base,shadow,touching,dt,appearanceId=0,ordinary=false){
  time+=dt;meshGroup.visible=!!shadow?.active&&shadow.length>0;if(!meshGroup.visible)return;
  const hx=(shadow.handX-400)*.05,hz=(shadow.handY-300)*.05,dx=hx-base.x,dz=hz-base.z,len=Math.hypot(dx,dz);if(len<.1){meshGroup.visible=false;return;}
  const nx=dx/len,nz=dz/len,px=-nz,pz=nx;
  const contour=ordinary?ordinaryOutline(len,appearanceId):shadowOutline(len,appearanceId);
  if(ordinary!==lastOrdinary){positions=new Float32Array(contour.length*3);geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(THREE.ShapeUtils.triangulateShape(contour,[]).flat());lastOrdinary=ordinary;}
  for(let i=0;i<contour.length;i++){const {x:u,y:v}=contour[i];positions[i*3]=base.x+px*u+nx*v;positions[i*3+1]=0;positions[i*3+2]=base.z+pz*u+nz*v;}
  geometry.attributes.position.needsUpdate=true;ring.position.set(hx,.025,hz);ringMaterial.opacity=touching?.65+Math.sin(time*6)*.12:0;
  meshGroup.userData.handX=hx;meshGroup.userData.handZ=hz;meshGroup.userData.ordinary=ordinary;meshGroup.userData.tipX=positions[42];meshGroup.userData.tipZ=positions[44];
 },dispose(){geometry.dispose();material.dispose();ring.geometry.dispose();ringMaterial.dispose();}};
}
