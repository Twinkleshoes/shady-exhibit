import * as THREE from 'three';
/** Ambient contact only: never competes with the authoritative reaching silhouette.
 * Works with both software and hardware WebGL; no second directional shadow. */
export function createContactShadow(width:number,depth:number,opacity=.24){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
 const ctx=canvas.getContext('2d')!;
 const grad=ctx.createRadialGradient(48,48,4,48,48,47);
 grad.addColorStop(0,'rgba(25,28,35,1)');grad.addColorStop(.35,'rgba(25,28,35,.78)');grad.addColorStop(.72,'rgba(25,28,35,.25)');grad.addColorStop(1,'rgba(25,28,35,0)');
 ctx.fillStyle=grad;ctx.fillRect(0,0,96,96);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),material);mesh.name='ambient-contact-shadow';mesh.rotation.x=-Math.PI/2;mesh.position.y=.008;
 return mesh;
}
export function disposeContactShadow(mesh:ReturnType<typeof createContactShadow>){mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();}
/** Rectangular falloff follows a case footprint, so long cases keep a soft
 * contact edge instead of hiding an elliptical blob completely underneath. */
export function createBoxContactShadow(width:number,depth:number,opacity=.22){
 const margin=.65,canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const dx=Math.max(0,Math.abs((x/127-.5)*(width+margin*2))-width/2),dz=Math.max(0,Math.abs((y/127-.5)*(depth+margin*2))-depth/2);
  const distance=Math.hypot(dx,dz),i=(y*128+x)*4;
  pixels.data[i]=25;pixels.data[i+1]=28;pixels.data[i+2]=35;pixels.data[i+3]=Math.round(255*Math.exp(-distance*distance/.12));
 }
 ctx.putImageData(pixels,0,0);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity,depthWrite:false,toneMapped:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width+margin*2,depth+margin*2),material);mesh.name='ambient-box-contact-shadow';mesh.rotation.x=-Math.PI/2;mesh.position.y=.008;return mesh;
}
