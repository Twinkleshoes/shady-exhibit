import * as THREE from 'three';
/** Restrained, local procedural finishes. Material maps add low-contrast grain,
 * not baked gameplay shadows or shiny marble reflections. */
export function createMuseumPalette(){
 const textures:THREE.Texture[]=[];
 function grain(base:string,kind:'plaster'|'stone'|'wood'){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=256;const a=c.getContext('2d')!;a.fillStyle=base;a.fillRect(0,0,256,256);
  if(kind==='wood'){for(let x=0;x<256;x+=3){a.strokeStyle=`rgba(38,24,15,${.025+.022*(1+Math.sin(x*2.1))})`;a.beginPath();a.moveTo(x,0);a.bezierCurveTo(x+2,80,x-2,170,x,256);a.stroke();}}
  else for(let y=0;y<256;y+=8)for(let x=0;x<256;x+=8){const v=Math.sin(x*1.73+y*2.11);a.fillStyle=v>0?'rgba(255,255,255,.026)':'rgba(60,48,32,.022)';a.fillRect(x,y,8,8);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;textures.push(t);return t;
 }
 const material=(color:number,roughness:number,metalness=0,map:THREE.Texture|null=null)=>new THREE.MeshStandardMaterial({color,roughness,metalness,map});
 const plaster=material(0xffffff,.96,0,grain('#d8cbb4','plaster')),limestone=material(0xffffff,.95,0,grain('#d0c7b6','stone')),stone=material(0xffffff,.87,0,grain('#a4a8a1','stone'));
 const oak=material(0xffffff,.8,0,grain('#79543a','wood')),darkwood=material(0x49392d,.86),brass=material(0xa58a50,.57,.62),bronze=material(0x81704c,.56,.55),ceiling=material(0xd5cebf,.97),trim=material(0xc4b798,.9),navy=material(0x1b3550,.87),terra=material(0xa76c54,.93),sage=material(0x768b7a,.93),green=material(0x43664d,.96),velvet=material(0x453c32,1),velvetBlue=material(0x1b2c49,1),darkMetal=material(0x5d696b,.67,.25);
 // Direct low-strength cube reflections avoid an expensive PMREM prefilter on every role change.
 const glass=new THREE.MeshPhongMaterial({color:0xcbdcdd,specular:0xa5b4b6,shininess:60,transparent:true,opacity:.105,side:THREE.DoubleSide,depthWrite:false,forceSinglePass:true,reflectivity:.08,combine:THREE.MixOperation});
 if(typeof document!=='undefined'){
  const faces=Array.from({length:6},(_,i)=>{const c=document.createElement('canvas');c.width=c.height=64;const a=c.getContext('2d')!,g=a.createLinearGradient(0,0,0,64);g.addColorStop(0,i===2?'#dceaf0':'#a7b8bc');g.addColorStop(.5,'#c7d1ce');g.addColorStop(1,'#a79d8b');a.fillStyle=g;a.fillRect(0,0,64,64);a.fillStyle='rgba(238,246,246,.35)';a.fillRect(20,5,5,35);return c;});
  const env=new THREE.CubeTexture(faces);env.colorSpace=THREE.SRGBColorSpace;env.needsUpdate=true;textures.push(env);glass.envMap=env;
 }
 const materials={plaster,limestone,stone,oak,darkwood,brass,bronze,ceiling,trim,navy,terra,sage,green,velvet,velvetBlue,darkMetal,glass};
 return {...materials,materials:Object.values(materials),disposeTextures(){textures.forEach(t=>t.dispose());}};
}
export type MuseumPalette=ReturnType<typeof createMuseumPalette>;
/** Four quiet 1.2m limestone tiles per repeat, independently scaled per room. */
export function limestoneFloor(width:number,depth:number){
 const c=document.createElement('canvas');c.width=c.height=512;const a=c.getContext('2d')!;a.fillStyle='#cfc8b9';a.fillRect(0,0,512,512);
 for(let y=0;y<4;y++)for(let x=0;x<4;x++){const tone=1+Math.round(2*Math.sin(x*2.3+y*1.7));a.fillStyle=`rgb(${207+tone},${200+tone},${185+tone})`;a.fillRect(x*128+1,y*128+1,126,126);a.strokeStyle='rgba(101,94,79,.16)';a.lineWidth=1;a.strokeRect(x*128+.5,y*128+.5,127,127);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(width/4.8,depth/4.8);t.anisotropy=4;return new THREE.MeshStandardMaterial({map:t,roughness:.98});
}
