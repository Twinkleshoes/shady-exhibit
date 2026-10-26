import * as THREE from 'three';
import {createMuseumPalette,type MuseumPalette} from './museum-materials.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {FINISH_DETAILS,ROOMS,wallHeight} from './world.js';
import {createBoxContactShadow} from './contact-shadow.js';
import type {Wall,Treasure} from '../types/game.js';
const wx=(x:number)=>(x-400)*.05,wz=(y:number)=>(y-300)*.05;
export function createFinishedRooms(scene:THREE.Scene,palette:MuseumPalette=createMuseumPalette()){
 const mat=(color:number,roughness=.88,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const cream=palette.plaster,stone=palette.stone,terra=palette.terra,sage=palette.sage,wood=palette.oak,darkwood=palette.darkwood,brass=palette.brass,bronze=palette.bronze,green=palette.green,velvet=palette.velvet,glass=palette.glass;
 function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o;}
 function shape(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);scene.add(o);return o;}
 function proxy(w:Wall){const o=new THREE.Mesh(new THREE.BoxGeometry(w.width*.05,wallHeight(w),w.height*.05),stone);o.position.set(wx(w.x+w.width/2),wallHeight(w)/2,wz(w.y+w.height/2));o.updateMatrixWorld(true);return o;}
 function contact(x:number,z:number,w:number,d:number){const o=createBoxContactShadow(w,d,.28);o.position.x=x;o.position.z=z;scene.add(o);}
 function plaque(text:string,x:number,y:number,z:number,width=2,rotation=0,background='#eee6d3'){
  const c=document.createElement('canvas');c.width=768;c.height=112;const a=c.getContext('2d')!;a.fillStyle=background;a.fillRect(0,0,768,112);a.strokeStyle='#aa9159';a.lineWidth=5;a.strokeRect(3,3,762,106);a.fillStyle=background==='#173a45'?'#f1e8d5':'#364236';a.textAlign='center';a.textBaseline='middle';a.font='500 43px serif';a.fillText(text,384,57,725);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const o=shape(new THREE.PlaneGeometry(width,width*112/768),new THREE.MeshStandardMaterial({map:tex,roughness:1}),x,y,z);o.rotation.y=rotation;return o;
 }
 function pane(width:number,height:number,x:number,y:number,z:number,ry=0,rx=0){const o=shape(new THREE.PlaneGeometry(width,height),glass,x,y,z);o.rotation.set(rx,ry,0);}
 function enclosure(x:number,z:number,w:number,d:number,base:number,top:number,frame:THREE.Material){
  const post=.045,ex=w/2-.065,ez=d/2-.065,gh=top-base;
  for(const dx of [-1,1])for(const dz of [-1,1])box(post,gh,post,frame,x+dx*ex,base+gh/2,z+dz*ez);
  for(const yy of [base+post/2,top-post/2])for(const side of [-1,1]){box(w-.13-post,post,post,frame,x,yy,z+side*ez);box(post,post,d-.13-post,frame,x+side*ex,yy,z);}
  for(const side of [-1,1]){pane(w-.18,gh-.12,x,base+gh/2,z+side*ez);pane(d-.18,gh-.12,x+side*ex,base+gh/2,z,Math.PI/2);}pane(w-.18,d-.18,x,top-.06,z,0,-Math.PI/2);
 }
 function pottery(x:number,y:number,z:number,height:number,radius:number,color=terra){
  const profile=[[0,0],[.72,.03],[.85,.18],[1,.4],[.85,.65],[.42,.83],[.42,.96],[.53,1]].map(([r,h])=>new THREE.Vector2(r*radius,h*height));
  const o=shape(new THREE.LatheGeometry(profile,24),color,x,y,z);shape(new THREE.TorusGeometry(radius*.48,.025,8,24),brass,x,y+height*.96,z).rotation.x=Math.PI/2;return o;
 }
 // Shallow wall-mounted panels and rails, never new barriers across circulation.
 for(const [edge,accent] of [[1,terra],[1399,sage]] as const){
  for(const y of [610,850,1120,1300])box(.06,2.7,6,accent,wx(edge),2.4,wz(y));
  for(const h of [.16,1,4.7])box(.07,.07,47,brass,wx(edge),h,wz(930));
 }
 function illustration(x:number,z:number,rotation:number,variant:number){
  const c=document.createElement('canvas');c.width=512;c.height=384;const a=c.getContext('2d')!;a.fillStyle='#e0d0ad';a.fillRect(0,0,512,384);a.strokeStyle='#716044';a.lineWidth=4;
  if(variant%2===0){for(let i=0;i<7;i++){const xx=65+i*55;a.strokeRect(xx,115,25,175);}a.beginPath();a.moveTo(40,110);a.lineTo(256,40);a.lineTo(472,110);a.closePath();a.stroke();a.strokeRect(40,300,432,15);}else{a.beginPath();a.ellipse(256,185,185,120,-.15,0,Math.PI*2);a.stroke();for(let i=0;i<5;i++){a.beginPath();a.moveTo(90+i*70,80);a.bezierCurveTo(450,150,60,230,420-i*40,310);a.stroke();}}
  a.font='22px serif';a.textAlign='center';a.fillText(variant%2?'EARLY TRADE ROUTES':'ARCHITECTURE OF ANTIQUITY',256,356);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const frame=box(.12,2.8,3.65,wood,x,2.7,z);const p=shape(new THREE.PlaneGeometry(3.4,2.55),new THREE.MeshStandardMaterial({map:t,roughness:1}),x+(rotation>0?.075:-.075),2.7,z);p.rotation.y=rotation;return frame;
 }
 for(const [i,y] of [620,850,1160].entries())illustration(wx(1397),wz(y),-Math.PI/2,i);
 // Mounted directional plaques and headers clear of heads and the third-person camera.
 const headers=new Set<string>();
 for(const [x,y,text,rot] of [[467,740,'SCULPTURE GALLERY',Math.PI/2],[933,740,'HISTORY GALLERY',-Math.PI/2],[453,740,'ATRIUM · RECEPTION',-Math.PI/2],[947,740,'ATRIUM · RECEPTION',Math.PI/2],[453,1300,'SOUTH CONNECTION',-Math.PI/2],[947,1300,'SOUTH CONNECTION',Math.PI/2]] as const){
  plaque(text,wx(x),4.25,wz(y),3.9,rot);const key=(x<700?'west':'east')+y;if(!headers.has(key)){box(.8,.16,7.4,cream,wx(x<700?460:940),4.7,wz(y));headers.add(key);}for(const dz of [-1.2,1.2])box(.025,.12,.025,brass,wx(x),4.58,wz(y)+dz);
 }
 for(const [x,text] of [[220,'SCULPTURE GALLERY'],[1230,'HISTORY GALLERY']] as const){plaque(text,wx(x),4.3,wz(453),3.9,Math.PI);box(7.4,.16,.2,cream,wx(x),4.7,wz(460));}
 plaque('WELCOME · TICKETS & INFORMATION',wx(700),.73,wz(1270)+.055,5.3);
 plaque('MAIN ENTRANCE',wx(700),2.6,wz(1398),3.4,Math.PI);
 plaque('SECURITY HOLDING',wx(560),2.3,wz(973),3,Math.PI);
 plaque('SHADOW RELEASE · HOLD E',wx(560),1.9,wz(973),2.8,Math.PI);
 plaque('ESCAPE ASSEMBLY',wx(835),2.1,wz(973),3.7);
 function detail(w:Wall){
  const d=FINISH_DETAILS.find(d=>d.id===w.id);if(!d)return false;const x=wx(d.x+d.width/2),z=wz(d.y+d.height/2),h=d.elevation-d.baseHeight;
  if(d.kind==='study'){
   const geometry=new THREE.TorusKnotGeometry(.67,.17,56,8,2,3);geometry.computeBoundingBox();const bounds=geometry.boundingBox!;const sy=h/(bounds.max.y-bounds.min.y);const form=shape(geometry,bronze,x,d.baseHeight-bounds.min.y*sy,z);form.scale.y=sy;
   plaque('CONTINUUM · BRONZE STUDY',x,.45,z+1.31,2.0);
  }else if(d.kind==='bust'){
   shape(new THREE.CylinderGeometry(.44,.5,h*.15,20),stone,x,d.baseHeight+h*.075,z);
   const shoulders=shape(new THREE.SphereGeometry(.5,20,12),stone,x,d.baseHeight+h*.34,z);shoulders.scale.set(1,.6,.62);
   shape(new THREE.CylinderGeometry(.17,.2,h*.25,16),stone,x,d.baseHeight+h*.56,z);
   const head=shape(new THREE.SphereGeometry(.25,20,16),stone,x,d.baseHeight+h*.78,z);head.scale.set(.85,1.05,.85);
   box(.12,.1,.13,stone,x,d.baseHeight+h*.78,z+.23);
  }else if(d.kind==='obelisk'){
   box(.8,h*.76,.8,stone,x,d.baseHeight+h*.38,z);shape(new THREE.ConeGeometry(.57,h*.24,4),bronze,x,d.baseHeight+h*.88,z).rotation.y=Math.PI/4;
  }else if(d.kind==='orb'){
   shape(new THREE.CylinderGeometry(.4,.48,.16,20),bronze,x,d.baseHeight+.08,z);
   shape(new THREE.SphereGeometry(.48,24,16),terra,x,d.baseHeight+.65,z);
   const ring=shape(new THREE.TorusGeometry(.5,.035,10,36),bronze,x,d.baseHeight+.65,z);ring.rotation.x=Math.PI/2;
  }else if(d.kind==='sweep'){
   // Low paired flowing forms fit the shared solid bounds and leave useful atrium camera coverage.
   for(const side of [-1,1]){const o=shape(new THREE.TorusGeometry(.9,.12,12,64),bronze,x,d.baseHeight+1.55,z+side*.08);o.scale.set(1.1,1.6,1);o.rotation.y=side*.25;}
   plaque('CONFLUENCE · 2026',x,d.baseHeight*.55,z+1.16,1.9);
  }else if(d.kind==='plant'){
   pottery(x,0,z,.6,.35,cream);for(let i=0;i<7;i++){const angle=i*Math.PI*2/7;const o=shape(new THREE.SphereGeometry(.25,12,8),green,x+Math.cos(angle)*.12,1.1+(i%3)*.17,z+Math.sin(angle)*.12);o.scale.set(.55,1.6,.55);o.rotation.z=Math.cos(angle)*.4;}
  }else if(d.kind==='benchback'){box(w.width*.05,1.08,w.height*.05,wood,x,.54,z);}
  return true;
 }
 function wall(w:Wall):THREE.Mesh|undefined{
  const x=wx(w.x+w.width/2),z=wz(w.y+w.height/2),width=w.width*.05,depth=w.height*.05,h=wallHeight(w);
  if(detail(w))return proxy(w);
  if(w.id.startsWith('gem_bay_wall')||w.id.startsWith('gem_recess')){
   box(width,h,depth,cream,x,h/2,z);box(width+.014,.06,depth+.014,brass,x,h-.04,z);
   if(w.id.startsWith('gem_recess'))box(width-.08,h-.45,depth+.018,mat(0x173a60),x,h/2,z);
   return proxy(w);
  }
  if(w.id==='reception'){
   box(width,h-.1,depth,wood,x,(h-.1)/2,z);box(width,.1,depth,stone,x,h-.05,z);
   for(let xx=-width/2+.15;xx<width/2;xx+=.28)box(.045,h-.25,.025,darkwood,x+xx,(h-.25)/2,z+depth/2+.015);
   contact(x,z,width,depth);return proxy(w);
  }
  if(w.id.startsWith('bench_atrium')){
   const seatZ=z+.5;box(width,.14,depth-1.2,wood,x,.48,seatZ);
   for(const dz of [-1.25,1.6])box(width*.8,.4,.18,darkwood,x,.2,seatZ+dz);
   contact(x,z,width,depth);return proxy(w);
  }
  if(w.id==='plinth_atrium_privacy'){
   box(width-.04,h-.3,depth-.04,sage,x,.25+(h-.3)/2,z);box(width,.25,depth,wood,x,.125,z);box(width,.05,depth,stone,x,h-.025,z);
   for(const side of [-1,1])for(const end of [-1,1])box(.05,h-.3,.05,wood,x+side*(width/2-.025),.25+(h-.3)/2,z+end*(depth/2-.025));
   for(let yy=.4;yy<h-.2;yy+=.35)for(let zz=-depth/2+.2;zz<depth/2;zz+=.4){const leaf=shape(new THREE.SphereGeometry(.16,8,6),green,x+width/2+.008,yy,z+zz);leaf.scale.set(.1,1,1);}
   contact(x,z,width,depth);return proxy(w);
  }
  if(w.id==='escape_privacy_partition'){
   box(width,h,depth,cream,x,h/2,z);box(width,.08,depth+.012,wood,x,.2,z);return proxy(w);
  }
  if((w.id.startsWith('cabinet_history')||w.id==='cabinet_history_c')){
   if(w.id.endsWith('_a')||w.id.endsWith('_b')||w.id==='cabinet_history_c'){
    box(width,h-.08,depth,wood,x,(h-.08)/2,z);box(width,.08,depth,stone,x,h-.04,z);
    const top=w.id.endsWith('_a')?2.3:2.1;
    pane(width-.42,top-h-.16,x,(h+top)/2,z+depth/2-.065);pane(width-.42,depth-.24,x,top-.08,z+.08,0,-Math.PI/2);
    for(const yy of [h+.03,top-.03])box(width-.4,.06,.08,wood,x,yy,z+depth/2-.04);
    for(const i of [-1,0,1]){const station=x+i*width*.25;pottery(station,h+.03,z,.75+(i+1)*.12,.27+i*.015,i===0?terra:stone);if(width>4){pottery(station+.48,h+.03,z+.15,.21,.18,terra);box(.32,.045,.38,stone,station-.43,h+.04,z+.15);}}
    plaque(w.id.endsWith('_a')?'VESSELS OF THE ANCIENT WORLD':'DAILY LIFE · EARLY SETTLEMENTS',x,.43,z+depth/2+.012,Math.min(4,width*.8));contact(x,z,width,depth);
   }else box(width,h,depth,wood,x,h/2,z);
   return proxy(w);
  }
  if((w.id.startsWith('partition_history')||w.id==='history_bay_partition')){
   box(width,h,depth,sage,x,h/2,z);box(width+.012,.06,depth,wood,x,h-.04,z);plaque('ARCHIVE · CULTURE & CRAFT',x+width/2+.014,2,z,3.6,Math.PI/2);return proxy(w);
  }
  if(w.id.startsWith('plinth_sculpture')||w.id==='pedestal_sculpture_study'||w.id==='pedestal_atrium'||w.id==='pedestal_sculpture'||w.id==='pedestal_history'){
   const history=w.id==='pedestal_history';
   // A single beveled body and inset deck avoid coincident trim faces and thin edge aliasing.
   const body=box(width,h-.025,depth,history?wood:stone,x,(h-.025)/2,z);body.geometry.dispose();body.geometry=new RoundedBoxGeometry(width,h-.025,depth,2,.065);
   const deck=box(width-.16,.025,depth-.16,history?brass:palette.limestone,x,h-.0125,z);deck.geometry.dispose();deck.geometry=new RoundedBoxGeometry(width-.16,.025,depth-.16,2,.008);
   contact(x,z,width,depth);
   if(w.id.startsWith('plinth_sculpture')){
    const names:Record<string,string>={plinth_sculpture_a:'THE THINKER · STUDY IN STONE',plinth_sculpture_b:'ASCENT · CARVED OBELISK',plinth_sculpture_c:'CELESTIAL FORM · TERRACOTTA'};
    plaque(names[w.id],x,h*.48,z+depth/2+.012,Math.min(3,width*.8));
   }
   if(w.id==='pedestal_sculpture'||history){enclosure(x,z,width,depth,h,2.65,history?wood:brass);const cushion=shape(new THREE.SphereGeometry(1,24,12),velvet,x,h+.13,z);cushion.scale.set(.65,.12,.65);plaque(history?'IMPERIAL SEAL':'BRONZE SUN',x,.6,z+depth/2+.012,1.7);}
   return proxy(w);
  }
  return undefined;
 }
 function treasure(t:Treasure){
  if(t.id==='treasure_gem')return undefined;
  const o=new THREE.Mesh(t.id==='treasure_sculpture'?new THREE.CylinderGeometry(.32,.32,.12,32):new THREE.CylinderGeometry(.36,.36,.13,24),t.id==='treasure_sculpture'?bronze:sage);
  if(t.id==='treasure_sculpture'){o.geometry.rotateX(Math.PI/2);for(let i=0;i<12;i++){const a=i*Math.PI/6;const ray=new THREE.Mesh(new THREE.ConeGeometry(.055,.15,3),brass);ray.position.set(Math.sin(a)*.36,Math.cos(a)*.36,0);ray.rotation.z=-a;o.add(ray);}}
  else{const handle=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.22,16),darkwood);handle.position.y=.15;o.add(handle);}
  o.position.set(wx(t.x),1.73,wz(t.y));scene.add(o);return o;
 }
 function movable(mesh:THREE.Mesh,id:string,width:number,depth:number){
  if(id==='display_gem')return;
  mesh.material=id==='display_sculpture'?palette.sage:wood;
  if(id==='display_sculpture'){const relief=new THREE.Mesh(new THREE.TorusKnotGeometry(.38,.065,40,6),bronze);relief.scale.z=.14;relief.position.set(0,.35,depth/2+.035);mesh.add(relief);}
  for(const side of [-1,1]){const rim=new THREE.Mesh(new THREE.BoxGeometry(width+.016,.06,depth+.016),id==='display_sculpture'?cream:brass);rim.position.y=side*.9;mesh.add(rim);}
  const p=plaque(id==='display_sculpture'?'SCULPTURE STUDY':'ARCHIVE CABINET',0,0,0,Math.min(width*.8,1.7));scene.remove(p);p.position.set(0,.1,depth/2+.012);mesh.add(p);
 }
 return {wall,treasure,movable};
}
