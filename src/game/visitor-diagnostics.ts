import * as THREE from 'three';
import type {Shadow3DController} from './shadow3d.js';
import type {CharacterController} from './character3d.js';
// Read-only diagnostics for browser verification. Contains only visitors already
// rendered for this client; no server roles, usernames or hidden guard suspects.
const samples=new WeakMap<THREE.WebGLRenderer,{start:number;frames:number}>();
export function recordVisitorFrame(renderer:THREE.WebGLRenderer,characters:Map<string,CharacterController>,now:number,shadows?:Map<string,Shadow3DController>){
 const sample=samples.get(renderer)||{start:now,frames:0};sample.frames++;samples.set(renderer,sample);if(now-sample.start<800)return;
 const models=[...characters.values()].map(c=>{let rig:THREE.SkinnedMesh|undefined;let label=false,marker=false;c.group.traverse(o=>{if(o instanceof THREE.SkinnedMesh)rig=o;if(o.name==='visitor-badge')label=o.visible;if(o.name==='private-team-marker')marker=o.visible;});return {badge:Number(c.group.name.replace('visitor_','')),appearanceId:c.group.userData.appearanceId,action:c.group.userData.action,peakKnee:c.group.userData.peakKnee,elbow:rig?.skeleton.bones.find(b=>b.name==='leftForearm')?.rotation.x,bones:rig?.skeleton.bones.length||0,vertices:rig?.geometry.attributes.position.count||0,label,marker,knee:rig?.skeleton.bones.find(b=>b.name==='leftShin')?.rotation.x||0,feet:rig?.skeleton.bones.filter(b=>b.name.endsWith('Foot')).map(b=>b.getWorldPosition(new THREE.Vector3()).y-.0555)};});
 (window as any).__visitorDiagnostics={fps:sample.frames*1000/(now-sample.start),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,models,shadows:[...(shadows||new Map()).entries()].map(([id,s])=>({id,active:s.meshGroup.visible,...s.meshGroup.userData}))};sample.start=now;sample.frames=0;
}
