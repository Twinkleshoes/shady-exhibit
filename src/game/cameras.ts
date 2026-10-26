import * as THREE from 'three';
import { Wall, Vector2D } from '../types/game.js';
import {CAMERA_PAN_LIMIT} from './settings.js';
import {wallHeight} from './world.js';
const preset=(id:string,name:string,x:number,y:number,tx:number,ty:number,height=4.3)=>({id,name,position:[(x-400)*.05,height,(y-300)*.05],target:[(tx-400)*.05,1.1,(ty-300)*.05]});
export const CAMERAS = [
 preset('cam_01','CAM 01: Skylit atrium',900,580,700,850),
 preset('cam_02','CAM 02: Gem Gallery',700,65,700,240),
 preset('cam_03','CAM 03: Sculpture / west arch',230,510,230,680),
 preset('cam_04','CAM 04: Sculpture Gallery',230,1340,230,1120),
 preset('cam_05','CAM 05: History / east arch',1170,510,1170,680),
 preset('cam_06','CAM 06: History Gallery',1170,1340,1170,1120),
];
export function clampPan(pan:number) {return Number.isFinite(pan)?Math.max(-CAMERA_PAN_LIMIT,Math.min(CAMERA_PAN_LIMIT,pan)):0;}
export function cameraTarget(cameraId:string,pan=0):THREE.Vector3 {
 const c=CAMERAS.find(c=>c.id===cameraId)||CAMERAS[0],position=new THREE.Vector3().fromArray(c.position);
 return new THREE.Vector3().fromArray(c.target).sub(position).applyAxisAngle(new THREE.Vector3(0,1,0),-clampPan(pan)).add(position);
}
export function cameraIsLive(state:{status:string;guard:{activeCameraId:string;disabledCameras:Record<string,number>}},id:string) {
 return state.status==='playing'&&state.guard.activeCameraId===id&&!(state.guard.disabledCameras[id]>0);
}
// Same perspective and 3D boxes as rendering. The server owns camera selection.
export function visibleOnCamera(pos: Vector2D, cameraId: string, walls: Wall[], aspect=1.5, elevation=1.1, pan=0): boolean {
 const preset=CAMERAS.find(c=>c.id===cameraId); if(!preset) return false;
 const camera=new THREE.PerspectiveCamera(54,aspect,0.1,220);
 camera.position.fromArray(preset.position); camera.lookAt(cameraTarget(cameraId,pan));
 camera.updateMatrixWorld();
 const point=new THREE.Vector3((pos.x-400)*.05,elevation,(pos.y-300)*.05);
 const clip=point.clone().project(camera);
 if(Math.abs(clip.x)>1 || Math.abs(clip.y)>1 || clip.z < -1 || clip.z>1) return false;
 const distance=camera.position.distanceTo(point);
 const ray=new THREE.Ray(camera.position,point.clone().sub(camera.position).normalize());
 for(const w of walls) {
  if(w.type==='railing') continue;
  const height=wallHeight(w);
  const box=new THREE.Box3(new THREE.Vector3((w.x-400)*.05,0,(w.y-300)*.05), new THREE.Vector3((w.x+w.width-400)*.05,height,(w.y+w.height-300)*.05));
  const hit=ray.intersectBox(box,new THREE.Vector3());
  if(hit && camera.position.distanceTo(hit)<distance-.05) return false;
 }
 return true;
}

/** Recognizable body samples: exposed heads/shoulders remain observable above
 * or beside cover. Shadow points and treasure checks keep their point-ray rule. */
export function visitorSightPoints(pos:Vector2D,cameraId:string){
 const c=CAMERAS.find(c=>c.id===cameraId);if(!c)return [];
 const dx=pos.x-(c.position[0]/.05+400),dy=pos.y-(c.position[2]/.05+300),d=Math.hypot(dx,dy)||1;
 return [{...pos,elevation:1.8},{...pos,elevation:1.1},{...pos,elevation:.45},...[-1,1].map(side=>({x:pos.x-dy/d*5*side,y:pos.y+dx/d*5*side,elevation:1.35}))];
}
export function visibleVisitorOnCamera(pos:Vector2D,cameraId:string,walls:Wall[],aspect=1.5,pan=0){
 return visitorSightPoints(pos,cameraId).some(p=>visibleOnCamera(p,cameraId,walls,aspect,p.elevation,pan));
}
