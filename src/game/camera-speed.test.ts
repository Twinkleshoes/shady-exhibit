import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,newPlayer,startRound,stepRoom,clientState,selectCamera,panCamera,centerCamera,inspect,refreshShadows,sees,lobby} from './engine.js';
import {CAMERAS,cameraIsLive,visibleOnCamera,cameraTarget} from './cameras.js';
import {WALK_SPEED,gaitAdvance,CAMERA_PAN_LIMIT,CAMERA_PAN_SPEED} from './settings.js';
function fixture(){const r=newRoom('PAN','0');r.playerOrder=['0','1','2','3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r);return r;}
const thief=(r:ReturnType<typeof fixture>)=>Object.values(r.players).find(p=>p.role==='thief')!;
function advance(r:ReturnType<typeof fixture>,seconds:number,direction=0){for(let t=0;t<seconds-.0001;t+=.05){panCamera(r,r.cameraId,direction,1000);stepRoom(r,.05,1000);}}
test('Exactly one LIVE camera across all thieves; feed switching and disabled feed are synchronized',()=>{
 const r=fixture();for(const {id} of CAMERAS){
  selectCamera(r,id,1.5);for(const p of Object.values(r.players).filter(p=>p.role==='thief')){const s=clientState(r,p.id);assert.deepEqual(CAMERAS.filter(c=>cameraIsLive(s,c.id)).map(c=>c.id),[id]);}
 }
 selectCamera(r,'cam_02',1.5);r.disabledCameras.cam_02=5;for(const p of Object.values(r.players))assert.equal(CAMERAS.filter(c=>cameraIsLive(clientState(r,p.id),c.id)).length,0);
 selectCamera(r,'cam_03',1.5);assert(cameraIsLive(clientState(r,thief(r).id),'cam_03'));
 r.status='gameover';assert(!cameraIsLive(clientState(r,thief(r).id),'cam_03'));
});
test('Panning has a fixed origin, finite limits, per-camera memory and clean round reset',()=>{
 const r=fixture(),origin=[...CAMERAS[0].position];advance(r,3,1);assert.equal(r.cameraPans.cam_01,CAMERA_PAN_LIMIT);assert.deepEqual(CAMERAS[0].position,origin);
 const panned=cameraTarget('cam_01',r.cameraPans.cam_01);assert(panned.distanceTo(cameraTarget('cam_01',0))>1);
 selectCamera(r,'cam_02',1.5);advance(r,.5,-1);const second=r.cameraPans.cam_02;selectCamera(r,'cam_01',1.5);assert.equal(r.cameraPans.cam_01,CAMERA_PAN_LIMIT);
 selectCamera(r,'cam_02',1.5);assert.equal(r.cameraPans.cam_02,second);
 lobby(r);startRound(r);assert(Object.values(r.cameraPans).every(n=>n===0));assert.equal(r.cameraPanInput.direction,0);assert.equal(r.cameraId,'cam_01');
});
test('Pan affects visibility and inspection; leaving view cancels without refund',()=>{
 const r=fixture(),p=thief(r);p.x=780;p.y=850;refreshShadows(r);assert(inspect(r,p.badgeNumber));advance(r,1.2,1);
 assert(!sees(r,p));assert.equal(r.activeInspection,null);assert.equal(r.guardCharges,2);assert(!p.isCaptured);assert(!inspect(r,p.badgeNumber));
 centerCamera(r,'cam_01');assert(sees(r,p));assert(inspect(r,p.badgeNumber));
});
test('Panning reveals previously outside-frustum visitors but preserves solid-wall occlusion',()=>{
 const pos={x:1000,y:850};assert(!visibleOnCamera(pos,'cam_01',[],1.5,1.1,0));assert(visibleOnCamera(pos,'cam_01',[],1.5,1.1,-.4));
 assert(!visibleOnCamera(pos,'cam_01',[{id:'screen',x:800,y:650,width:180,height:80,elevation:5}],1.5,1.1,-.4));
});
test('Stale, wrong-camera and nonfinite pan inputs cannot keep moving a camera; disabled feed cannot pan',()=>{
 const r=fixture();panCamera(r,'cam_02',1,1000);stepRoom(r,.05,1000);assert.equal(r.cameraPans.cam_01,0);
 panCamera(r,'cam_01',NaN,1000);stepRoom(r,.05,1000);assert.equal(r.cameraPans.cam_01,0);
 panCamera(r,'cam_01',1,1000);stepRoom(r,.1,1000);const angle=r.cameraPans.cam_01;stepRoom(r,.1,1300);assert.equal(r.cameraPans.cam_01,angle);
 r.disabledCameras.cam_01=5;panCamera(r,'cam_01',1,1000);stepRoom(r,.1,1000);assert.equal(r.cameraPans.cam_01,angle);
});
test('Normal NPC and thief travel distances and gait rates match on open floor, with no diagonal sprint',()=>{
 const r=fixture(),p=thief(r),npc=r.visitors[0];p.x=450;p.y=380;npc.x=450;npc.y=350;npc.heading=Math.PI/2;npc.visitorPlan={mode:'walk',goal:{x:700,y:350},remaining:0,stuck:0};
 p.input={dx:1,dy:0,at:1000};for(let i=0;i<20;i++)stepRoom(r,.05,1000);
 assert(Math.abs((p.x-450)-WALK_SPEED)<.001);assert(Math.abs((npc.x-450)-WALK_SPEED)<.001);assert.equal(p.walkSpeed,npc.walkSpeed);assert.equal(gaitAdvance(p.walkSpeed,1),gaitAdvance(npc.walkSpeed,1));
 p.x=450;p.y=350;p.input={dx:1,dy:1,at:1000};stepRoom(r,.1,1000);assert(Math.abs(Math.hypot(p.x-450,p.y-350)-WALK_SPEED*.1)<.001);
});
test('NPC pauses are stationary with idle gait; it turns before resuming at normal speed',()=>{
 const r=fixture(),npc=r.visitors[0];npc.x=450;npc.y=350;npc.heading=0;npc.visitorPlan={mode:'pause',goal:{x:450,y:350},remaining:1,stuck:0};advance(r,.5);
 assert.equal(npc.x,450);assert.equal(npc.y,350);assert.equal(npc.walkSpeed,0);assert.equal(gaitAdvance(npc.walkSpeed,.5),0);
 npc.heading=0;npc.visitorPlan={mode:'turn',goal:{x:650,y:350},remaining:0,stuck:0};advance(r,.2);assert.equal(npc.x,450);assert(npc.heading>0);advance(r,1);assert(npc.x>450);assert(Math.abs(npc.walkSpeed-WALK_SPEED)<.001);
});
