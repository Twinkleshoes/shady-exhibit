import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
export type Field=(x:number,y:number,z:number)=>number;
export const smoothUnion=(a:number,b:number,k=.04)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
export function ellipsoid(x:number,y:number,z:number,rx:number,ry:number,rz:number){const a=Math.hypot(x/rx,y/ry,z/rz),b=Math.hypot(x/(rx*rx),y/(ry*ry),z/(rz*rz));return a<1e-8?-Math.min(rx,ry,rz):a*(a-1)/b;}
export function limb(x:number,y:number,z:number,cx:number,top:number,bottom:number,rTop:number,rBottom:number,depth=1){const t=THREE.MathUtils.clamp((top-y)/(top-bottom),0,1),r=THREE.MathUtils.lerp(rTop,rBottom,t);return Math.hypot(x-cx,y-THREE.MathUtils.lerp(top,bottom,t),z/depth)-r;}
/** Closed, welded marching-tetrahedra surface; gradients orient faces outward.
 * Shared cache callers build each anatomical variant once, not once per frame. */
export function implicitSurface(field:Field,min:THREE.Vector3,max:THREE.Vector3,step:number){
 const nx=Math.ceil((max.x-min.x)/step),ny=Math.ceil((max.y-min.y)/step),nz=Math.ceil((max.z-min.z)/step),dx=(max.x-min.x)/nx,dy=(max.y-min.y)/ny,dz=(max.z-min.z)/nz;
 const stride=nx+1,layer=stride*(ny+1),values=new Float32Array(layer*(nz+1));
 const at=(x:number,y:number,z:number)=>z*layer+y*stride+x;
 for(let z=0;z<=nz;z++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)values[at(x,y,z)]=field(min.x+x*dx,min.y+y*dy,min.z+z*dz);
 const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],vertices:number[]=[];
 const emit=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>{const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),m=a.clone().add(b).add(c).multiplyScalar(1/3),e=.002;if(field(m.x+n.x*e,m.y+n.y*e,m.z+n.z*e)<field(m.x-n.x*e,m.y-n.y*e,m.z-n.z*e))[b,c]=[c,b];vertices.push(...a.toArray(),...b.toArray(),...c.toArray());};
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const v=corners.map(([a,b,c])=>values[at(x+a,y+b,z+c)]);if(v.every(n=>n>=0)||v.every(n=>n<0))continue;
  const p=corners.map(([a,b,c])=>new THREE.Vector3(min.x+(x+a)*dx,min.y+(y+b)*dy,min.z+(z+c)*dz));
  const cut=(a:number,b:number)=>p[a].clone().lerp(p[b],v[a]/(v[a]-v[b]));
  for(const t of tets){const i=t.filter(n=>v[n]<0),o=t.filter(n=>v[n]>=0);if(!i.length||!o.length)continue;if(i.length===1)emit(cut(i[0],o[0]),cut(i[0],o[1]),cut(i[0],o[2]));else if(o.length===1)emit(cut(o[0],i[0]),cut(o[0],i[1]),cut(o[0],i[2]));else{const a=cut(i[0],o[0]),b=cut(i[0],o[1]),c=cut(i[1],o[1]),d=cut(i[1],o[0]);emit(a,b,c);emit(a,c,d);}}
 }
 const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const g=mergeVertices(raw,1e-5);raw.dispose();g.computeVertexNormals();g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;
}
