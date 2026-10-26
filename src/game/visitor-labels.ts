import * as THREE from 'three';
/** Labels obey the rendered view, including actual wall/exhibit camera proxies. */
const ray=new THREE.Raycaster(),target=new THREE.Vector3(),clip=new THREE.Vector3();
export function visitorLabelVisible(camera:THREE.Camera,x:number,z:number,occluders:THREE.Object3D[]){
 target.set(x,1.9,z);clip.copy(target).project(camera);if(Math.abs(clip.x)>1||Math.abs(clip.y)>1||clip.z< -1||clip.z>1)return false;
 const distance=camera.position.distanceTo(target);ray.set(camera.position,target.clone().sub(camera.position).normalize());ray.far=distance-.08;const blocked=ray.intersectObjects(occluders,false).length>0;ray.far=Infinity;return !blocked;
}
