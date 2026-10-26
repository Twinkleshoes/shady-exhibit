import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import bakedData from './assets/visitor-surfaces.json';
import {appearanceFor} from './appearances.js';
import {ellipsoid,limb,smoothUnion,implicitSurface,type Field} from './visitor-surface.js';
const bodyCache=new Map<string,THREE.BufferGeometry>(),hairCache=new Map<string,THREE.BufferGeometry>();
type Baked={position:number[];normal:number[];index:number[]};
const baked=bakedData as Record<string,Baked>;
function bakedGeometry(key:string){const data=baked[key],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normal,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(data.position.length/3*2),2));g.setIndex(data.index);return g;}
const clamp=THREE.MathUtils.clamp,blend=THREE.MathUtils.smoothstep;
function bodySurface(style:string,authoring=false){
 const key=authoring?'authoring':'baked';if(bodyCache.has(key))return bodyCache.get(key)!.clone();if(!authoring&&baked.body){const g=bakedGeometry('body');bodyCache.set(key,g);return g.clone();}
 const field:Field=(x,y,z)=>{
  // Rounded tapered chest/waist, continuous shoulders and a blended pelvis.
  let d=ellipsoid(x,Math.sign(y-1.23)*Math.max(0,Math.abs(y-1.23)-.16),z,.195+.04*blend(y,1.03,1.32),.12,.142+.018*blend(y,1.03,1.32));
  d=smoothUnion(d,ellipsoid(x,y-.94,z,.222,.13,.148),.045);
  d=smoothUnion(d,limb(x,y,z,0,1.64,1.46,.075,.085),.04);
  d=smoothUnion(d,ellipsoid(x,y-1.735,z,.163,.207,.151),.045);
  d=smoothUnion(d,ellipsoid(x,y-1.72,z-.145,.031,.044,.046),.015);
  for(const side of [-1,1]){
   d=smoothUnion(d,ellipsoid(x-side*.158,y-1.735,z,.032,.049,.028),.015);
   d=smoothUnion(d,limb(x,y,z,side*.145,.91,.48,.111,.086,.96),.035);
   d=smoothUnion(d,limb(x,y,z,side*.145,.48,.09,.086,.058,.97),.026);
  }
  for(const side of [-1,1]){
   const armX=side*(.31+clamp((1.365-y)/.55,0,1)*.08);
   // Attach only at the shoulder, after building the complete torso/legs.
   // Later smoothing against the pelvis must never rejoin a forearm to it.
   let arm=limb(x,y,z,armX,1.365,1.09,.102,.079,.92);
   arm=smoothUnion(arm,limb(x,y,z,armX,1.09,.835,.079,.051,.94),.035);
   arm=smoothUnion(arm,ellipsoid(x-side*.39,y-.77,z-.012,.058,.093,.043),.028);
   arm=smoothUnion(arm,ellipsoid(x-side*.348,y-.785,z-.043,.027,.05,.026),.019);
   d=smoothUnion(d,arm,y>1.28?.065:.001);
  }
  return d;
 };
 const g=implicitSurface(field,new THREE.Vector3(-.45,.015,-.29),new THREE.Vector3(.45,1.98,.25),.038);bodyCache.set(key,g);return g.clone();
}
function hairSurface(style:string,authoring=false){
 const key=(authoring?'authoring-':'baked-')+style;if(hairCache.has(key))return hairCache.get(key)!.clone();if(!authoring&&baked[style]){const g=bakedGeometry(style);hairCache.set(key,g);return g.clone();}
 const pony=[new THREE.Vector3(0,1.81,-.13),new THREE.Vector3(0,1.78,-.215),new THREE.Vector3(0,1.68,-.255),new THREE.Vector3(0,1.55,-.25),new THREE.Vector3(.018,1.50,-.22)];
 const curve=new THREE.CatmullRomCurve3(pony),pts=curve.getPoints(16);
 const field:Field=(x,y,z)=>{
  const az=Math.atan2(x,z),front=Math.max(0,Math.cos(az)),bob=style==='bob';
  const line=(bob?1.58:1.66)+front**4*(bob?.235:.15)+.008*Math.sin(az*5);
  const wave=style==='curls'?.007*Math.sin(az*10)*Math.sin((y-1.6)*55):.002*Math.sin(az*6);
  const outer=ellipsoid(x,y-1.735,z+.008,.177+wave,bob?.245:.222,.166+wave),inner=ellipsoid(x,y-1.735,z,.158,.201,.146);
  let d=Math.max(outer,line-y);
  if(style==='pony')for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],ab=b.clone().sub(a),t=clamp(new THREE.Vector3(x-a.x,y-a.y,z-a.z).dot(ab)/ab.lengthSq(),0,1),p=a.clone().addScaledVector(ab,t),f=(i+t)/(pts.length-1),r=.047+Math.sin(f*Math.PI)*.013-f*.034;d=smoothUnion(d,Math.hypot(x-p.x,y-p.y,z-p.z)-r,.028);}
  return d;
 };
 const g=implicitSurface(field,new THREE.Vector3(-.20,1.45,-.33),new THREE.Vector3(.20,1.99,.19),.024);hairCache.set(key,g);return g.clone();
}
/** Original continuous organic surfaces, blended to the same fifteen-bone rig.
 * Appearance and animation remain role-independent and entirely local assets. */
export function createVisitorRig(appearanceId:number,authoring=false){
 const look=appearanceFor(appearanceId),bones:THREE.Bone[]=[],byName:Record<string,THREE.Bone>={};
 function bone(name:string,parent:THREE.Bone|null,x:number,y:number,z:number){const b=new THREE.Bone();b.name=name;b.position.set(x,y,z);parent?.add(b);bones.push(b);byName[name]=b;return b;}
 const hips=bone('hips',null,0,.91,0),spine=bone('spine',hips,0,.18,0);bone('head',spine,0,.49,0);
 for(const side of [-1,1]){const id=side<0?'left':'right',thigh=bone(id+'Thigh',hips,side*.145,0,0),shin=bone(id+'Shin',thigh,0,-.43,0);bone(id+'Foot',shin,0,-.42,0);const arm=bone(id+'Arm',spine,side*.31,.29,0),forearm=bone(id+'Forearm',arm,side*.04,-.29,0);bone(id+'Hand',forearm,side*.04,-.27,0);}
 hips.updateMatrixWorld(true);const idx=(n:string)=>bones.indexOf(byName[n]),parts:THREE.BufferGeometry[]=[];
 const palette=[look.skin,look.hair,look.top,look.bottom,0x353334,0xe5ded0,0x302b29].map(c=>new THREE.Color(c));
 function weights(x:number,y:number,z:number):[number,number][]{
  const id=x<0?'left':'right',ax=Math.abs(x);
  if(y>1.57)return [[idx('head'),1]];
  if(y>1.47){const t=blend(y,1.49,1.62);return [[idx('spine'),1-t],[idx('head'),t]];}
  const side=x<0?-1:1,armX=side*(.31+clamp((1.365-y)/.55,0,1)*.08);
  const armDistance=Math.min(limb(x,y,z,armX,1.365,1.09,.102,.079,.92),limb(x,y,z,armX,1.09,.835,.079,.051,.94),ellipsoid(x-side*.39,y-.77,z-.012,.058,.093,.043),ellipsoid(x-side*.348,y-.785,z-.043,.027,.05,.026));
  const coreDistance=Math.min(ellipsoid(x,y-.94,z,.222,.13,.148),limb(x,y,z,side*.145,.91,.48,.111,.086,.96),ellipsoid(x,Math.sign(y-1.23)*Math.max(0,Math.abs(y-1.23)-.16),z,.195+.04*blend(y,1.03,1.32),.12,.142+.018*blend(y,1.03,1.32)));
  if((y>1.26&&ax>.19)||(y<=1.26&&armDistance<coreDistance)){
   const shoulder=y>1.16?clamp(blend(ax,.19,.32)+1-blend(y,1.16,1.32),0,1):1;
   let limbWeights:[number,number][];
   if(y>1.16)limbWeights=[[idx(id+'Arm'),1]];
   else if(y>.995){const t=blend(1.16-y,0,.165);limbWeights=[[idx(id+'Arm'),1-t],[idx(id+'Forearm'),t]];}
   else{const t=blend(.88-y,0,.12);limbWeights=[[idx(id+'Forearm'),1-t],[idx(id+'Hand'),t]];}
   return [[idx('spine'),1-shoulder],...limbWeights.map(([i,w])=>[i,w*shoulder] as [number,number])];
  }
  if(y>1.00){const t=blend(y,1.0,1.13);return [[0,1-t],[idx('spine'),t]];}
  if(y>.75){const t=blend(.95-y,0,.20),left=blend(-x,-.04,.04);return [[0,1-t],[idx('leftThigh'),t*left],[idx('rightThigh'),t*(1-left)]];}
  if(y>.38){const t=blend(.58-y,0,.20);return [[idx(id+'Thigh'),1-t],[idx(id+'Shin'),t]];}
  const t=blend(.20-y,0,.13);return [[idx(id+'Shin'),1-t],[idx(id+'Foot'),t]];
 }
 function colorAt(x:number,y:number,z:number){
  const ax=Math.abs(x);if(y>1.51||(ax>.25&&y<.855))return 0;
  if(y<1.0&&ax<.27)return look.style==='skirt'&&y<.80?0:3;
  if(look.style==='jacket'&&z>.12&&ax<.11&&y>1.03&&y<1.47)return 5;
  return 2;
 }
 function part(g:THREE.BufferGeometry,color:number|((x:number,y:number,z:number)=>number),rig:number|((x:number,y:number,z:number)=>[number,number][]),x=0,y=0,z=0,sx=1,sy=1,sz=1){
  g.scale(sx,sy,sz);g.translate(x,y,z);if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}g.clearGroups();
  const p=g.attributes.position,n=p.count,organic=new Float32Array(n).fill(typeof color==='number'?0:1),indices=new Uint16Array(n*4),w=new Float32Array(n*4),colors=new Float32Array(n*3);
  for(let i=0;i<n;i++){const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),pairs=typeof rig==='number'?[[rig,1]]:rig(px,py,pz),active=pairs.filter(a=>a[1]>1e-7),total=active.reduce((s,a)=>s+a[1],0);let used=0;
   active.forEach(([index,value],j)=>{indices[i*4+j]=index;const value32=j===active.length-1?1-used:Math.fround(value/total);w[i*4+j]=value32;used+=w[i*4+j];});
   let c=palette[typeof color==='number'?color:color(px,py,pz)];if(typeof color!=='number'&&Math.abs(px)<.27&&py>.975&&py<1.025)c=palette[3].clone().lerp(palette[2],blend(py,.975,1.025));colors.set([c.r,c.g,c.b],i*3);
  }
  g.setAttribute('surfacePart',new THREE.Float32BufferAttribute(new Float32Array(n).fill(parts.length===0?1:parts.length===1?2:3),1));g.setAttribute('organicMask',new THREE.Float32BufferAttribute(organic,1));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));parts.push(g);
 }
 part(bodySurface(look.style,authoring),colorAt,weights);
 const organicVertices=parts[0].attributes.position.count;
 part(hairSurface(look.hairStyle,authoring),1,idx('head'));
 const hairVertices=parts[1].attributes.position.count;
 if(look.style==='skirt'){
  const profile=[[.235,.995],[.26,.94],[.29,.81],[.32,.69],[.31,.69],[.28,.81],[.25,.94],[.225,.995],[.235,.995]].map(([r,y])=>new THREE.Vector2(r,y));
  part(new THREE.LatheGeometry(profile,32),3,(x,y)=>{const t=blend(.99-y,0,.29)*.45,left=clamp(.5-x/.20,0,1);return [[0,1-t],[idx('leftThigh'),t*left],[idx('rightThigh'),t*(1-left)]];},0,0,0,1,1,.86);
 }
 const ball=(r:number)=>new THREE.SphereGeometry(r,12,8),rounded=(w:number,h:number,d:number,r=.025)=>new RoundedBoxGeometry(w,h,d,2,r);
 for(const side of [-1,1]){
  const id=side<0?'left':'right';part(rounded(.18,.115,.30,.042),4,idx(id+'Foot'),side*.145,.068,.065);part(rounded(.182,.025,.302,.009),5,idx(id+'Foot'),side*.145,.02,.065);
  part(ball(.027),5,idx('head'),side*.06,1.755,.145,1,.8,.37);part(ball(.013),6,idx('head'),side*.06,1.754,.157,1,1,.4);
  part(rounded(.052,.01,.012,.004),1,idx('head'),side*.06,1.795,.144);
 }
 const smile=new THREE.CatmullRomCurve3([new THREE.Vector3(-.033,1.681,.143),new THREE.Vector3(0,1.672,.149),new THREE.Vector3(.033,1.681,.143)]);part(new THREE.TubeGeometry(smile,8,.004,5,false),6,idx('head'));
 if(look.hat){part(new THREE.CylinderGeometry(.181,.185,.063,20),3,idx('head'),0,1.935,0);part(rounded(.22,.022,.12,.01),3,idx('head'),0,1.909,.14);}
 if(look.bag){part(rounded(.28,.32,.14,.05),3,idx('spine'),0,1.24,-.215);for(const side of [-1,1]){
   const path=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.15,1.06,.115),new THREE.Vector3(side*.165,1.30,.122),new THREE.Vector3(side*.15,1.43,.08),new THREE.Vector3(side*.14,1.44,-.09),new THREE.Vector3(side*.14,1.30,-.25)]);part(new THREE.TubeGeometry(path,16,.012,6,false),3,idx('spine'));
  }}
 const merged=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());const geometry=mergeVertices(merged,1e-5);merged.dispose();geometry.clearGroups();
 const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.91,flatShading:false});
 // Material boundaries use bind-space coordinates, so cuffs and waistbands
 // remain clean across the curved triangulation instead of ragged vertex bands.
 material.onBeforeCompile=shader=>{
  shader.uniforms.visitorSkin={value:palette[0]};shader.uniforms.visitorTop={value:palette[2]};shader.uniforms.visitorBottom={value:palette[3]};shader.uniforms.visitorLining={value:palette[5]};shader.uniforms.visitorSkirt={value:look.style==='skirt'?1:0};shader.uniforms.visitorJacket={value:look.style==='jacket'?1:0};
  shader.vertexShader='attribute float organicMask; varying float vOrganic; varying vec3 vBind;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOrganic=organicMask;vBind=position;');
  shader.fragmentShader='uniform vec3 visitorSkin,visitorTop,visitorBottom,visitorLining; uniform float visitorSkirt,visitorJacket; varying float vOrganic; varying vec3 vBind;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 cloth=visitorTop;
   float ax=abs(vBind.x);
   float lower=(1.0-smoothstep(.994,1.002,vBind.y))*(1.0-smoothstep(.26,.275,ax));
   vec3 legColor=mix(visitorBottom,visitorSkin,visitorSkirt*(1.0-smoothstep(.785,.80,vBind.y)));
   cloth=mix(cloth,legColor,lower);
   float neck=smoothstep(1.504,1.512,vBind.y);
   float hands=(1.0-smoothstep(.85,.858,vBind.y))*smoothstep(.265,.28,ax);
   cloth=mix(cloth,visitorSkin,max(neck,hands));
   float lining=(1.0-smoothstep(.095,.108,ax))*smoothstep(.121,.128,vBind.z)*smoothstep(1.025,1.04,vBind.y)*(1.0-smoothstep(1.46,1.475,vBind.y))*visitorJacket;
   cloth=mix(cloth,visitorLining,lining);
   diffuseColor.rgb=mix(diffuseColor.rgb,cloth,vOrganic);
  `);
 };
 material.customProgramCacheKey=()=> 'smooth-museum-visitor-v2';
 const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name='rigged-visitor';mesh.add(hips);const skeleton=new THREE.Skeleton(bones);mesh.bind(skeleton);mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),1.35);mesh.frustumCulled=true;mesh.castShadow=true;
 mesh.userData={appearanceId,rigBones:bones.length,organicVertices,hairVertices,surfaceVersion:2};
 return {mesh,bones:byName,look,dispose(){geometry.dispose();material.dispose();skeleton.dispose();}};
}
