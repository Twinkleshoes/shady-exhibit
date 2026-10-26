import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createMuseumPalette,type MuseumPalette} from './museum-materials.js';
import {createContactShadow,createBoxContactShadow} from './contact-shadow.js';
import {ROOMS} from './world.js';
import type {Wall} from '../types/game.js';
const wx=(x:number)=>(x-400)*.05,wz=(y:number)=>(y-300)*.05;
/** Visual detailing stays within existing solid footprints or flush against walls.
 * Glass has no gameplay collision: the server's original shadow target is unchanged. */
export function createGemGallery(scene:THREE.Scene,palette:MuseumPalette=createMuseumPalette()){
 const blue=palette.navy,stone=palette.limestone,brass=palette.brass,velvet=palette.velvetBlue,glass=palette.glass;
 function box(w:number,h:number,d:number,mat:THREE.Material,x:number,y:number,z:number){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);scene.add(m);return m;}
 function plaque(text:string,x:number,y:number,z:number,width=1.5){const c=document.createElement('canvas');c.width=512;c.height=160;const a=c.getContext('2d')!;a.fillStyle='#eee6cf';a.fillRect(0,0,512,160);a.strokeStyle='#ad9259';a.lineWidth=10;a.strokeRect(5,5,502,150);a.fillStyle='#21354b';a.textAlign='center';a.font='bold 28px sans-serif';a.fillText(text,256,67,475);a.font='18px sans-serif';a.fillText('THE MUSEUM · MINERAL COLLECTION',256,113,475);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/3.2),new THREE.MeshStandardMaterial({map:t,roughness:1}));m.position.set(x,y,z);scene.add(m);return m;}
 // Thin wall-mounted panels, picture rails and cornices: no new floor barriers.
 for(const x of [420,660,900,1070]){box(x===90||x===1310?3:6,3.25,.055,blue,wx(x),2.45,wz(1));box(x===90||x===1310?3:6,.055,.075,brass,wx(x),.84,wz(2));}
 for(const y of [.18,1.05,4.72])box(40,.09,.08,brass,wx(750),y,wz(1));
 for(const x of [356,1143]){box(.06,.12,23,brass,wx(x),.18,wz(230));box(.06,.09,23,brass,wx(x),4.72,wz(230));}
 // Deep blue end-wall panels and raised botanical wall planters, above visitors.
 for(const x of [356,1143]){box(.045,3.25,6,blue,wx(x),2.45,wz(200));for(const y of [65,385]){box(.12,.42,.75,brass,wx(x),2.7,wz(y));for(let i=-1;i<=1;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),new THREE.MeshStandardMaterial({color:0x527866,roughness:1}));leaf.scale.set(.35,1.5,.8);leaf.position.set(wx(x),3.05+i*.08,wz(y)+i*.21);scene.add(leaf);}}}
 // Door surrounds remain on the solid jambs; the full 140-unit opening stays clear.
 for(const center of [700]){for(const side of [-1,1]){box(.22,4.7,.12,stone,wx(center+side*73),2.35,wz(453));box(.045,4.6,.15,brass,wx(center+side*72),2.3,wz(452));}box(7.6,.2,.15,stone,wx(center),4.7,wz(453));}
 plaque('PRECIOUS EARTH',wx(550),2.6,wz(3),2.7);plaque('THE ROYAL COLLECTION',wx(1010),2.6,wz(3),2.7);
 function contact(x:number,z:number,w:number,d:number,rectangular=true){const mesh=rectangular?createBoxContactShadow(w,d,.28):createContactShadow(w,d,.25);mesh.position.x=x;mesh.position.z=z;scene.add(mesh);return mesh;}
 function display(w:Wall,royal=false){const x=wx(w.x+w.width/2),z=wz(w.y+w.height/2),width=w.width*.05,depth=w.height*.05,h=w.elevation!;
  // One exterior surface at each height: original cap/base/glass bottom were coplanar.
  const base=box(width,h-.16,depth,blue,x,h/2,z);base.geometry.dispose();base.geometry=new RoundedBoxGeometry(width,h-.16,depth,2,.055);
  box(width,.08,depth,stone,x,.04,z);box(width,.08,depth,brass,x,h-.04,z);
  // Slight roughness variation in the inset top deck, below the framing.
  const deck=new THREE.MeshStandardMaterial({color:0xbda973,roughness:.72,metalness:.22});
  box(width-.14,.018,depth-.14,deck,x,h+.009,z);
  contact(x,z,width,depth);
  const gh=royal?1.4:1.05,gy=h+gh/2;
  const innerW=width-.17,innerD=depth-.17;
  // Five independent panes, no bottom face over the brass cap. Panes terminate
  // inside the frame and never share its planes or overlap at their edges.
  function pane(w:number,d:number,px:number,py:number,pz:number,ry=0,rx=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),glass);m.position.set(px,py,pz);m.rotation.set(rx,ry,0);m.name='gem-case-glass-panel';scene.add(m);}
  for(const side of [-1,1]){pane(innerW,gh-.12,x,gy,z+side*(depth/2-.06));pane(innerD,gh-.12,x+side*(width/2-.06),gy,z,Math.PI/2);}
  pane(innerW,innerD,x,h+gh-.06,z,0,-Math.PI/2);
  const post=.045,edgeX=width/2-.06,edgeZ=depth/2-.06;
  for(const dx of [-1,1])for(const dz of [-1,1])box(post,gh,post,brass,x+dx*edgeX,gy,z+dz*edgeZ);
  for(const yy of [h+post/2,h+gh-post/2]){
   for(const side of [-1,1]){box(width-.12-post,post,post,brass,x,yy,z+side*edgeZ);box(post,post,depth-.12-post,brass,x+side*edgeX,yy,z);}
  }
  const cushion=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),velvet);cushion.position.set(x,h+.14,z);cushion.scale.set(royal?.63:width*.4,.13,royal?.63:depth*.36);scene.add(cushion);
  plaque(royal?'ROYAL SAPPHIRE':w.id.endsWith('a')?'QUARTZ & AMETHYST':'CRYSTALS OF THE EARTH',x,h*.55,z+depth/2+.006,Math.min(width*.82,2.8));
  if(!royal)for(let i=-1;i<=1;i++){const mineral=new THREE.Mesh(new THREE.OctahedronGeometry(.25,0),new THREE.MeshStandardMaterial({color:w.id.endsWith('a')?0x8065b4:0x559e9a,roughness:.38,metalness:.12}));mineral.scale.y=1.5+(.2*i);mineral.position.set(x+i*width*.24,h+.44,z);scene.add(mineral);}
  const collision=new THREE.Mesh(new THREE.BoxGeometry(width,h,depth),blue);collision.position.set(x,h/2,z);collision.updateMatrixWorld(true);
  // Raycast-only proxy, never added to the scene.
  return collision;
 }
 const signCanvas=document.createElement('canvas');signCanvas.width=768;signCanvas.height=96;const signCtx=signCanvas.getContext('2d')!;signCtx.fillStyle='#173a60';signCtx.fillRect(0,0,768,96);signCtx.strokeStyle='#b69b60';signCtx.lineWidth=6;signCtx.strokeRect(3,3,762,90);signCtx.fillStyle='#f3ead5';signCtx.textAlign='center';signCtx.font='500 49px serif';signCtx.fillText('GEM GALLERY',384,65);
 const signTex=new THREE.CanvasTexture(signCanvas);signTex.colorSpace=THREE.SRGBColorSpace;
 box(3.66,.51,.06,brass,wx(700),4.35,wz(467));
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.45),new THREE.MeshStandardMaterial({map:signTex,roughness:.9}));sign.position.set(wx(700),4.35,wz(468));sign.name='mounted-gem-gallery-sign';scene.add(sign);
 for(const dx of [-1.2,1.2])box(.035,.3,.035,brass,wx(700)+dx,4.59,wz(467));

 return {display,blue,brass,plaque,contact};
}
