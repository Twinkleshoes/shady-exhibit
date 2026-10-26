import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,newPlayer,startRound,stepRoom,refreshShadows,inspect,selectCamera,capture,clientState,lobby,evaluateFinal,targetFor,toggleObject} from './engine.js';
import {visibleOnCamera} from './cameras.js';
import {calculateShadow,selectLamp,resolveWallCollisions,PLAYER_RADIUS} from './physics.js';
import {LAMP_PUZZLES,defaultWalls,ESCAPE,HOLDING,RELEASE_SPAWNS} from './world.js';
function setup(){const r=newRoom('TEST','p0');r.playerOrder=['p0','p1','p2','p3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r);return r;}
function tick(r:ReturnType<typeof setup>,seconds:number){for(let t=0;t<seconds-.0001;t+=.05)stepRoom(r,.05,1e9);}
function free(r:ReturnType<typeof setup>){return Object.values(r.players).filter(p=>p.role==='thief');}
function position(r:ReturnType<typeof setup>,p:ReturnType<typeof free>[number],x:number,y:number){p.x=x;p.y=y;p.input={dx:0,dy:0,at:0};refreshShadows(r);}
function solution(r:ReturnType<typeof setup>,target:{x:number;y:number},p=free(r)[0]){
 // This rules fixture explicitly establishes a moved puzzle lamp. Carrying is tested separately.
 for(const a of LAMP_PUZZLES)Object.assign(r.lamps.find(l=>l.id===a.id)!,a.lamp);refreshShadows(r);
 for(let y=target.y-200;y<=target.y+200;y+=5)for(let x=target.x-200;x<=target.x+200;x+=5){
  const resolved=resolveWallCollisions({x,y},PLAYER_RADIUS,r.walls);if(Math.hypot(resolved.x-x,resolved.y-y)>.1)continue;
  position(r,p,x,y);const hit=targetFor(r,p);if(hit&&Math.hypot(hit.x-target.x,hit.y-target.y)<1)return p;
 }throw Error('No reachable shadow position for '+JSON.stringify(target));
}
test('Three galleries have solvable targets with physical body barriers; steal requires escape',()=>{
 const r=setup();refreshShadows(r);for(const treasure of r.treasures){const p=solution(r,treasure);p.isStealing=true;tick(r,3.1);assert(treasure.stolen,treasure.name);assert.equal(r.status,'playing');}
 for(const p of free(r))position(r,p,ESCAPE.x+50,ESCAPE.y+50);tick(r,.05);assert.equal(r.winner,'thieves');
});
test('Independent uninterrupted progress resets on release, losing reach and changing targets',()=>{
 const r=setup(),[a,b]=free(r),t=r.treasures[0];solution(r,t,a);solution(r,t,b);
 a.isStealing=true;tick(r,1);assert(a.theftProgress>.9);
 a.isStealing=false;tick(r,.05);assert.equal(a.theftProgress,0);
 b.isStealing=true;tick(r,1);assert(!t.stolen);assert(b.theftProgress<1.1);
 position(r,b,120,380);tick(r,.05);assert.equal(b.theftProgress,0);
});
test('Rescue switch releases held teammates only after one free thief completes a fresh hold',()=>{
 const r=setup(),[a,b,c]=free(r);capture(r,b);capture(r,c);
 assert(b.isCaptured&&c.isCaptured);assert(b.x>=HOLDING.x&&b.x<=HOLDING.x+HOLDING.width);
 solution(r,r.switches[0],a);a.isStealing=true;tick(r,2);assert(b.isCaptured);tick(r,1.1);
 assert(!b.isCaptured&&!c.isCaptured);assert.equal(b.y,RELEASE_SPAWNS[0].y);assert.equal(c.y,RELEASE_SPAWNS[1].y);assert.equal(r.status,'playing');
});
test('All captures and six-minute expiry award guard; captured teammates may be left behind',()=>{
 const r=setup();for(const p of free(r))capture(r,p);tick(r,.05);assert.equal(r.winner,'guard');
 const timed=setup();timed.roundTimeLeft=.1;tick(timed,.15);assert.equal(timed.winner,'guard');
 const escape=setup(),[a,b,c]=free(escape);capture(escape,b);capture(escape,c);for(const t of escape.treasures)t.stolen=true;
 position(escape,a,ESCAPE.x+50,ESCAPE.y+50);tick(escape,.05);assert.equal(escape.winner,'thieves');
});
test('Simultaneous escape requires every uncaptured thief inside and all treasures stolen',()=>{
 const r=setup(),[a,b,c]=free(r);for(const t of r.treasures)t.stolen=true;
 position(r,a,ESCAPE.x+50,ESCAPE.y+50);position(r,b,ESCAPE.x+70,ESCAPE.y+70);assert.equal(evaluateFinal(r),null);
 position(r,c,ESCAPE.x+90,ESCAPE.y+80);assert.equal(evaluateFinal(r)?.winner,'thieves');
 r.treasures[1].stolen=false;assert.equal(evaluateFinal(r),null);
});
test('Camera switch disables for five seconds, immediately cancels scan, and cannot retrigger during cooldown',()=>{
 const r=setup(),[actor,target]=free(r),sw=r.switches.find(s=>s.kind==='camera')!;
 solution(r,sw,actor);
 // Put a target directly in the vault feed, avoiding the pedestal's occlusion.
 position(r,target,760,330);selectCamera(r,sw.cameraId!,1.5);assert(inspect(r,target.badgeNumber));
 actor.isStealing=true;actor.theftProgress=2.95;actor.interactionTargetId=sw.id;tick(r,.1);
 assert.equal(r.activeInspection,null);assert.equal(r.guardCharges,2);assert(r.disabledCameras[sw.cameraId!]>4.8);assert(sw.cooldown>29);
 assert(!inspect(r,target.badgeNumber));assert(r.alerts.some(a=>a.includes('CAMERA ALERT')));
 actor.isStealing=true;tick(r,5.1);assert.equal(r.disabledCameras[sw.cameraId!],0);assert(sw.cooldown>24);assert.equal(actor.theftProgress,0);
 tick(r,25);assert.equal(sw.cooldown,0);
});
test('Inspection loses camera coverage or feed, consumes charge and refunds each spent charge independently',()=>{
 const r=setup(),p=free(r)[0];position(r,p,620,850);selectCamera(r,'cam_01',1.5);assert(inspect(r,p.badgeNumber));
 selectCamera(r,'cam_02',1.5);assert.equal(r.activeInspection,null);assert.equal(r.guardCharges,2);
 tick(r,10);selectCamera(r,'cam_01',1.5);assert(inspect(r,p.badgeNumber));position(r,p,200,600);tick(r,.05);assert.equal(r.activeInspection,null);
 tick(r,10);assert.equal(r.guardCharges,2);tick(r,10);assert.equal(r.guardCharges,3);
});
test('Nearest unobstructed lamp selection has hysteresis and railings do not block light',()=>{
 const lamps=[{id:'a',x:200,y:200,radius:26},{id:'b',x:400,y:200,radius:26}];
 assert.equal(selectLamp({x:305,y:200},lamps,[],'a')?.id,'a');
 assert.equal(selectLamp({x:330,y:200},lamps,[],'a')?.id,'b');
 assert.equal(selectLamp({x:300,y:200},lamps,[{id:'wall',x:250,y:150,width:10,height:100}],null)?.id,'b');
 assert.equal(selectLamp({x:300,y:200},lamps,[{id:'rail',x:250,y:150,width:10,height:100,type:'railing'}],null)?.id,'a');
});
test('Movable display casts blocking geometry and holding lifecycle clears it on restart',()=>{
 const r=setup(),p=free(r)[0],display=r.movables[0];position(r,p,display.x-25,display.y+25);toggleObject(r,p);assert.equal(p.carryingId,display.id);
 p.input={dx:1,dy:0,at:1e9};const start=display.x;stepRoom(r,.1,1e9);assert(display.x!==start);
 lobby(r);assert.equal(p.carryingId,null);assert.equal(display.holderId,null);const guard=r.guardIndex;startRound(r);assert.notEqual(r.guardIndex,guard);assert.equal(r.roundTimeLeft,360);assert(r.treasures.every(t=>!t.stolen));assert(r.switches.every(s=>s.cooldown===0));
});
test('Guard payload has only current visible suspects and no usernames, team flags or interaction guides',()=>{
 const r=setup(),guard=Object.values(r.players).find(p=>p.role==='guard')!;const [p]=free(r);position(r,p,620,850);p.isStealing=true;
 const s=clientState(r,guard.id);assert(s.players.length>0&&s.players.length<12);assert.equal(s.lobbyPlayers.length,0);
 assert(s.players.every(p=>p.name.startsWith('Suspect #')&&!p.isTeammate&&!p.isSelf&&p.activeLampId===null&&p.interactionTargetId===null&&p.interactionProgress===0));
 assert(s.lamps.every(l=>!l.holderId));selectCamera(r,'cam_03',1.5);assert(clientState(r,guard.id).players.every(p=>visibleOnCamera(p,r.cameraId,r.walls)));
});
test('Solid partitions block shortcuts while gallery door openings are walkable',()=>{
 const r=setup();let pos={x:420,y:600};for(let i=0;i<40;i++)pos=resolveWallCollisions({x:pos.x+4,y:pos.y},18,r.walls);assert(pos.x<454);
 pos={x:400,y:740};for(let i=0;i<40;i++)pos=resolveWallCollisions({x:pos.x+4,y:pos.y},18,r.walls);assert(pos.x>500);
});
test('Reaching shadow can enter CCTV while its owner is off screen; no role-linked ID or offline data',()=>{
 const r=setup(),p=free(r)[0],guard=Object.values(r.players).find(p=>p.role==='guard')!;// Find an actual new-map position whose reaching shadow enters the feed before its body.
 for(const a of LAMP_PUZZLES)Object.assign(r.lamps.find(l=>l.id===a.id)!,a.lamp);selectCamera(r,'cam_02',1.5);let found=false;
 for(let y=100;y<440&&!found;y+=5)for(let x=450;x<950&&!found;x+=5){position(r,p,x,y);p.isStealing=true;const s=clientState(r,guard.id);if(!s.players.some(q=>q.badgeNumber===p.badgeNumber)&&s.visibleShadows.length)found=true;}
 assert(found);
 const state=clientState(r,guard.id);assert(!state.players.some(q=>q.badgeNumber===p.badgeNumber));assert.equal(state.visibleShadows.length,1);assert(!state.visibleShadows[0].id.includes(String(p.badgeNumber)));assert.notEqual(state.visibleShadows[0].id,p.id);
 r.disabledCameras.cam_02=5;assert.equal(clientState(r,guard.id).visibleShadows.length,0);assert.equal(clientState(r,guard.id).players.length,0);
});
test('Carried display pushes stationary players out of its solid geometry',()=>{
 const r=setup(),[holder,victim]=free(r),prop=r.movables[0];position(r,holder,prop.x-25,prop.y+25);position(r,victim,prop.x+prop.width+30,prop.y+25);toggleObject(r,holder);
 const old=victim.x;holder.input={dx:1,dy:0,at:1e9};for(let i=0;i<4;i++)stepRoom(r,.1,1e9);assert(victim.x>old);assert(victim.x>=prop.x+prop.width+PLAYER_RADIUS-.001);
});

test('New Gem bay wall hides a panned suspect, rejects inspection and cancels a running scan without refund',()=>{
 const r=setup(),p=free(r)[0];selectCamera(r,'cam_02',1.5);r.cameraPans.cam_02=.8;
 position(r,p,220,180);assert(visibleOnCamera(p,'cam_02',r.walls.filter(w=>!w.id.startsWith('gem_bay_wall')),1.5,1.1,.8));assert(!visibleOnCamera(p,'cam_02',r.walls,1.5,1.1,.8));assert(!inspect(r,p.badgeNumber));assert.equal(r.guardCharges,3);
 position(r,p,500,180);assert(inspect(r,p.badgeNumber));position(r,p,220,180);tick(r,.05);assert.equal(r.activeInspection,null);assert.equal(r.guardCharges,2);assert(!p.isCaptured);
});
