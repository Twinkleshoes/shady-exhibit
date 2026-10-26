import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {buildMuseumScene,type MuseumSceneContext} from '../game/scene3d.js';
import {createCharacter3D,type CharacterController} from '../game/character3d.js';
import {WALK_SPEED} from '../game/settings.js';
const world=(x:number,y:number,h=0)=>new THREE.Vector3((x-400)*.05,h,(y-300)*.05);
const presets={menu:{eye:world(835,925,3.35),look:world(650,665,2.4)},lobby:{eye:world(850,850,3.1),look:world(640,640,2.3)}};
const walks=[{a:[600,600],b:[600,760],look:3},{a:[815,530],b:[815,650],look:7}];
// Local visual choreography only: no sockets, game state, timers or authoritative simulation.
function sample(index:number,time:number){const p=walks[index],distance=Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1]),travel=distance/WALK_SPEED,pause=8+index*2,cycle=2*(travel+pause),t=(time+index*4)%cycle;let fraction=0,moving=false,back=false;
 if(t<travel){fraction=t/travel;moving=true;}else if(t<travel+pause)fraction=1;else if(t<2*travel+pause){fraction=1-(t-travel-pause)/travel;moving=true;back=true;}else back=true;
 return {x:p.a[0]+(p.b[0]-p.a[0])*fraction,y:p.a[1]+(p.b[1]-p.a[1])*fraction,moving,heading:Math.atan2(p.b[0]-p.a[0],p.b[1]-p.a[1])+(back?Math.PI:0)};
}
export function MuseumBackdrop({variant,enabled,reducedMotion}:{variant:'menu'|'lobby';enabled:boolean;reducedMotion:boolean}){
 const mount=useRef<HTMLDivElement>(null),variantRef=useRef(variant),motionRef=useRef(reducedMotion),refresh=useRef<()=>void>(()=>{});
 const [mode,setMode]=useState('still');variantRef.current=variant;motionRef.current=reducedMotion;
 useEffect(()=>{refresh.current();},[variant,reducedMotion]);
 useEffect(()=>{
  setMode('still');if(!enabled||!mount.current)return;
  const host=mount.current;
  const metrics=(window as any).__menuBackdropMetrics ||= {created:0,disposed:0,active:0,loops:0,frames:0};
  let renderer:THREE.WebGLRenderer|undefined,museum:MuseumSceneContext|undefined,visitors:CharacterController[]=[],frame=0,running=false,stopped=false,counted=false,time=0,last=0,lastDraw=0,resize:ResizeObserver|undefined;
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;if(running){running=false;metrics.loops--;}};
  const dispose=()=>{if(stopped)return;stopped=true;stop();resize?.disconnect();document.removeEventListener('visibilitychange',visibility);renderer?.domElement.removeEventListener('webglcontextlost',lost);for(const v of visitors){museum?.scene.remove(v.group);v.dispose();}visitors=[];museum?.dispose();renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();if(counted){metrics.active--;metrics.disposed++;counted=false;}};
  const lost=(event:Event)=>{event.preventDefault();dispose();setMode('still');};
  const visibility=()=>{if(document.hidden)stop();else refresh.current();};
  try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.dataset.menuMuseum='true';
   museum=buildMuseumScene();const camera=new THREE.PerspectiveCamera(50,1,.1,180),target=new THREE.Vector3();camera.position.copy(presets[variantRef.current].eye);target.copy(presets[variantRef.current].look);
   visitors=walks.map((p,i)=>{const v=createCharacter3D(700+i,false,false,p.look),s=sample(i,0);v.group.position.copy(world(s.x,s.y));v.group.rotation.y=s.heading;v.setLabel(false);museum!.scene.add(v.group);return v;});
   host.appendChild(renderer.domElement);metrics.created++;metrics.active++;counted=true;
   const draw=(dt:number)=>{if(stopped||!renderer||!museum)return;const p=presets[variantRef.current],still=motionRef.current;
    const eye=p.eye.clone();if(!still){eye.x+=Math.sin(time*.075)*.24;eye.y+=Math.sin(time*.055)*.045;}
    if(still){camera.position.copy(eye);target.copy(p.look);}else{camera.position.lerp(eye,Math.min(1,dt*2.2));target.lerp(p.look,Math.min(1,dt*2.2));}camera.lookAt(target);
    for(const [i,v]of visitors.entries()){const s=sample(i,still?0:time);v.update(still?0:dt,world(s.x,s.y).x,world(s.x,s.y).z,!still&&s.moving,s.heading,!still&&s.moving?WALK_SPEED:0,still||!s.moving?'admire':'walk');}
    renderer.render(museum.scene,camera);metrics.frames++;
   };
   const tick=(now:number)=>{if(stopped||document.hidden||motionRef.current){stop();return;}if(now-lastDraw>=1000/24){const dt=last?Math.min(.08,(now-last)/1000):1/24;last=now;lastDraw=now;time+=dt;draw(dt);}frame=requestAnimationFrame(tick);};
   refresh.current=()=>{if(stopped)return;stop();last=0;lastDraw=0;if(document.hidden)return;draw(1/24);if(!motionRef.current){running=true;metrics.loops++;frame=requestAnimationFrame(tick);}};
   const size=()=>{if(stopped||!renderer)return;const {width,height}=host.getBoundingClientRect();renderer.setSize(Math.max(1,width),Math.max(1,height),false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();refresh.current();};
   resize=new ResizeObserver(size);resize.observe(host);renderer.domElement.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',visibility);size();setMode('live');
  }catch{dispose();setMode('still');}
  return()=>{refresh.current=()=>{};dispose();};
 },[enabled]);
 return <div className={`museum-backdrop museum-backdrop--${variant}`} data-backdrop-mode={mode} aria-hidden="true"><div className="museum-still"/><div ref={mount} className="museum-canvas" style={{opacity:mode==='live'?1:0}}/><div className="museum-vignette"/></div>;
}
