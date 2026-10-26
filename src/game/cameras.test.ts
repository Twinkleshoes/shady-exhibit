import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleOnCamera,CAMERAS} from './cameras.js';
import {calculateShadow,isShadowTouchingTreasure} from './physics.js';
test('Every CCTV has useful coverage; invalid feeds and points behind cameras rejected',()=>{
 for(const c of CAMERAS) {
  assert(visibleOnCamera({x:c.target[0]/.05+400,y:c.target[2]/.05+300},c.id,[]));
  assert(!visibleOnCamera({x:5000,y:5000},c.id,[]));
 }
 assert(!visibleOnCamera({x:400,y:300},'invalid',[]));
});
test('Solid 3D obstruction blocks inspection, railings transmit it',()=>{
 const pos={x:700,y:850};
 assert(visibleOnCamera(pos,'cam_01',[]));
 const mount=CAMERAS[0],cx=mount.position[0]/.05+400,cy=mount.position[2]/.05+300;
 const box={id:'pillar_test',x:(cx+pos.x)/2-40,y:(cy+pos.y)/2-40,width:80,height:80,type:'solid' as const};
 assert(!visibleOnCamera(pos,'cam_01',[box]));
 assert(visibleOnCamera(pos,'cam_01',[{...box,type:'railing'}]));
});
test('Single room puzzle has a reachable server-calculated solution across railing',()=>{
 const shadow=calculateShadow({x:490,y:225},{id:'lamp',x:380,y:280,radius:26},[{id:'rail',x:540,y:80,width:14,height:160,type:'railing'}]);
 assert(isShadowTouchingTreasure(shadow,{id:'gem',x:640,y:150,radius:24,name:'Gem',stolen:false}));
});
