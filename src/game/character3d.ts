import * as THREE from 'three';
import {createVisitorRig} from './visitor-rig.js';
import {createContactShadow,disposeContactShadow} from './contact-shadow.js';
import {gaitAdvance,WALK_SPEED} from './settings.js';
import type {VisitorAction} from './appearances.js';
export interface CharacterController{
 group:THREE.Group;
 update:(dt:number,x:number,z:number,isMoving:boolean,heading:number,speed?:number,action?:VisitorAction)=>void;
 setCaptured:(value:boolean)=>void;setInspected:(value:boolean)=>void;
 setLabel:(visible:boolean,privateMarker?:boolean)=>void;dispose:()=>void;
}
export function createCharacter3D(badge:number,isSelf:boolean,isTeammate:boolean,appearanceId=0):CharacterController{
 const group=new THREE.Group();group.name='visitor_'+badge;group.userData.appearanceId=appearanceId;
 const rig=createVisitorRig(appearanceId);group.add(rig.mesh);const b=rig.bones;
 const contact=createContactShadow(1.05,.95,.25);contact.userData.notVisitorHit=true;group.add(contact);
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#283438';ctx.fillRect(0,0,256,72);ctx.fillStyle='#f5f0e4';ctx.font='500 48px sans-serif';ctx.textAlign='center';ctx.fillText('#'+badge,128,53);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthWrite:false}));label.name='visitor-badge';label.position.y=2.1;label.scale.set(.62,.174,1);label.visible=false;group.add(label);
 const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.065),new THREE.MeshBasicMaterial({color:0x9a7ce1,depthWrite:false}));marker.name='private-team-marker';marker.position.y=2.35;marker.visible=false;marker.userData.notVisitorHit=true;group.add(marker);
 const badgeMat=new THREE.MeshBasicMaterial({map:tex});const chestBadge=new THREE.Mesh(new THREE.PlaneGeometry(.1,.028),badgeMat);chestBadge.position.set(-.12,.27,.18);b.spine.add(chestBadge);
 let captured=false,inspected=false,phase=badge*.71,time=0,walk=0,admire=0;
 function update(dt:number,x:number,z:number,moving:boolean,heading:number,speed=WALK_SPEED,action:VisitorAction='idle'){
  group.userData.action=action;time+=dt;group.position.x=THREE.MathUtils.damp(group.position.x,x,18,dt);group.position.z=THREE.MathUtils.damp(group.position.z,z,18,dt);
  const turn=Math.atan2(Math.sin(heading-group.rotation.y),Math.cos(heading-group.rotation.y));group.rotation.y+=turn*Math.min(1,dt*10);
  walk=THREE.MathUtils.damp(walk,moving&&!captured?Math.min(1,speed/WALK_SPEED):0,9,dt);admire=THREE.MathUtils.damp(admire,action==='admire'&&!captured&&!moving?1:0,7,dt);
  phase+=gaitAdvance(speed,dt);b.hips.position.y=.91-.07*walk+Math.sin(phase*2)*.008*walk;
  for(const side of [-1,1]){
   const id=side<0?'left':'right',p=phase+(side<0?0:Math.PI),swing=Math.sin(p),lift=Math.max(0,Math.cos(p));
   // Analytic two-bone IK: the stance sole remains on the floor while the
   // advancing foot follows a short arc. No rigid-leg pendulum or foot sinking.
   const footZ=swing*.28*walk,footY=.06+lift*.12*walk,dy=footY-b.hips.position.y;
   const distance=Math.min(.8499,Math.hypot(dy,footZ));
   const shin=Math.PI-Math.acos(THREE.MathUtils.clamp((.43**2+.42**2-distance**2)/(2*.43*.42),-1,1));
   const thigh=Math.atan2(-footZ,-dy)-Math.atan2(.42*Math.sin(shin),.43+.42*Math.cos(shin));
   group.userData.peakKnee=Math.max(group.userData.peakKnee||0,shin);b[id+'Thigh'].rotation.x=thigh;b[id+'Shin'].rotation.x=shin;b[id+'Foot'].rotation.x=-thigh-shin;
   b[id+'Arm'].rotation.x=-swing*.38*walk-admire*.22+(captured?.5:0);b[id+'Arm'].rotation.z=side*(.08+admire*.08+(captured?.1:0));
   b[id+'Forearm'].rotation.x=-.12-admire*(side<0?.55:.85)+(captured?.6:0);
  }
  b.spine.rotation.x=admire*.035+(captured?.08:0);b.spine.rotation.z=Math.sin(phase)*.025*walk;
  b.head.rotation.y=Math.sin(time*.8)*.15*admire;b.head.rotation.x=Math.sin(time*1.2)*.08*admire+(captured?.15:0);
  marker.rotation.y=time;label.material.color.setHex(inspected?0xffb6ad:0xffffff);

 }
 return {group,update,setCaptured(v){captured=v;},setInspected(v){inspected=v;},setLabel(v,privateMarker=false){label.visible=v&&!isSelf;marker.visible=privateMarker&&isTeammate&&!isSelf;},dispose(){rig.dispose();disposeContactShadow(contact);tex.dispose();label.material.dispose();marker.geometry.dispose();(marker.material as THREE.Material).dispose();chestBadge.geometry.dispose();badgeMat.dispose();}};
}
