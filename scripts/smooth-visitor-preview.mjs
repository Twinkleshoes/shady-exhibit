import {build} from 'esbuild';import {writeFile,mkdir,readFile} from 'node:fs/promises';import {chromium} from 'playwright';import path from 'node:path';
const out=path.resolve('test-artifacts/smooth-visitors');await mkdir(out,{recursive:true});
const entry=`import * as THREE from 'three';import {createCharacter3D} from '${path.resolve('src/game/character3d.ts')}';
const r=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1080,1440);r.setClearColor(0xe7e4dc);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.0;document.body.appendChild(r.domElement);const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0xc5bba8,2.4));const sun=new THREE.DirectionalLight(0xfff5e6,2.2);sun.position.set(5,12,8);scene.add(sun);const camera=new THREE.PerspectiveCamera(36,1,.1,30);
window.renderInspection=(id)=>{
 r.setScissorTest(false);r.clear();r.setScissorTest(true);let metrics=[];
 for(let row=0;row<4;row++){
  const c=createCharacter3D(103,false,false,id);scene.add(c.group);
  const action=['idle','walk','walk','admire'][row];
  for(let i=0;i<60;i++)c.update(1/60,0,0,action==='walk',0,action==='walk'?120:0,action);
  if(row===2)for(let i=0;i<5;i++)c.update(1/60,0,0,true,Math.PI*.75,120,'walk');
  c.group.updateMatrixWorld(true);let skin; c.group.traverse(o=>{if(o instanceof THREE.SkinnedMesh)skin=o;});skin.skeleton.update();let min=Infinity,max=-Infinity;for(let i=0;i<skin.geometry.attributes.position.count;i++){const v=new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position,i);skin.applyBoneTransform(i,v);if(!Number.isFinite(v.length()))throw Error('invalid skin deformation');min=Math.min(min,v.y);max=Math.max(max,v.y);}
  metrics.push({action,turning:row===2,min,max,vertices:skin.geometry.attributes.position.count,triangles:skin.geometry.index.count/3});
  for(let col=0;col<3;col++){
   const angle=[0,Math.PI/2,Math.PI][col];camera.position.set(Math.sin(angle)*3.35,1.33,Math.cos(angle)*3.35);camera.lookAt(0,1.02,0);r.setViewport(col*360,(3-row)*360,360,360);r.setScissor(col*360,(3-row)*360,360,360);r.render(scene,camera);
  }
  scene.remove(c.group);c.dispose();
 }
 return metrics;
};
window.renderCrowd=()=>new Promise(resolve=>{
 r.setScissorTest(false);r.setSize(1080,720);r.setViewport(0,0,1080,720);camera.aspect=1.5;camera.fov=38;camera.updateProjectionMatrix();camera.position.set(0,5,12);camera.lookAt(0,1,0);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(16,12),new THREE.MeshStandardMaterial({color:0xded9cd,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
 const people=Array.from({length:12},(_,i)=>{const c=createCharacter3D(201+i,false,false,i);c.group.position.set((i%6-2.5)*1.3,0,(Math.floor(i/6)-.5)*2.4);scene.add(c.group);return c;});
 let count=0,start=0,last=performance.now();const tick=now=>{const dt=Math.min(.1,(now-last)/1000);last=now;
 people.forEach((c,i)=>c.update(dt,(i%6-2.5)*1.3,(Math.floor(i/6)-.5)*2.4,i%3!==0,0,i%3===0?0:120,i%3===0?'admire':'walk'));
 r.render(scene,camera);count++;if(count===30)start=now;if(count<90)requestAnimationFrame(tick);else{let expected=0;people.forEach(c=>c.group.traverse(o=>{if(o instanceof THREE.SkinnedMesh)expected+=o.geometry.index.count/3;}));if(r.info.render.triangles<expected)throw Error('crowd not fully submitted');resolve({visitors:12,fps:60000/(now-start),triangles:r.info.render.triangles,drawCalls:r.info.render.calls,allSkinnedMeshesSubmitted:true});}};requestAnimationFrame(tick);
});window.previewReady=true;`;
await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,minify:true,platform:'browser',format:'iife',outfile:path.join(out,'inspection.js')});
const js=await readFile(path.join(out,'inspection.js'),'utf8');await writeFile(path.join(out,'inspection.html'),`<html><body style="margin:0;width:1080px;height:1440px;overflow:hidden"><script>${js}</script></body></html>`);
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await browser.newPage({viewport:{width:1080,height:1440}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.join(out,'inspection.html'));await p.waitForFunction(()=>window.previewReady);
for(const id of [1,2,3,11]){const result=await p.evaluate(id=>window.renderInspection(id),id);await p.screenshot({path:path.join(out,`inspection-${id}.png`)});console.log('Actual rig poses front/side/back',id,JSON.stringify(result));}const crowd=await p.evaluate(()=>window.renderCrowd());await p.setViewportSize({width:1080,height:720});await p.screenshot({path:path.join(out,'all-visitors-crowd.png')});console.log('Twelve simultaneous visible models / single-viewport stress fixture',JSON.stringify(crowd));await browser.close();if(errors.length)throw Error(errors.join(';'));
