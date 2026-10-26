// Offline authoring only. The runtime loads the bundled data synchronously.
import * as THREE from 'three';import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';import {createVisitorRig} from '../src/game/visitor-rig.ts';import {writeFile} from 'node:fs/promises';
const modifier=new SimplifyModifier(),output={};
for(const [name,id,tag,ratio]of [['body',0,1,.45],['short',0,2,.5],['curls',1,2,.5],['bob',2,2,.5],['pony',3,2,.5]]){
 const rig=createVisitorRig(id,true),source=rig.mesh.geometry,p=source.attributes.position,vertices=[];
 for(let i=0;i<source.index.count;i+=3){const a=source.index.getX(i);if(source.attributes.surfacePart.getX(a)!==tag)continue;for(let j=0;j<3;j++){const n=source.index.getX(i+j);vertices.push(p.getX(n),p.getY(n),p.getZ(n));}}
 const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));let g=mergeVertices(raw,1e-5);g.computeVertexNormals();const simplified=await modifier.modify(g,Math.round(g.attributes.position.count*(1-ratio)));simplified.computeVertexNormals();
 output[name]={position:Array.from(simplified.attributes.position.array,v=>+v.toFixed(6)),normal:Array.from(simplified.attributes.normal.array,v=>+v.toFixed(6)),index:Array.from(simplified.index.array)};
 console.log(name,g.attributes.position.count,'→',simplified.attributes.position.count,'vertices;',simplified.index.count/3,'triangles');raw.dispose();g.dispose();simplified.dispose();rig.dispose();
}
await writeFile('src/game/assets/visitor-surfaces.json',JSON.stringify(output));
