import test from 'node:test';import assert from 'node:assert/strict';
import {newRoom,newPlayer,startRound,stepRoom,toggleObject,capture,clientState,lobby,refreshShadows} from './engine.js';
import {LAMP_PUZZLES,defaultLamps,defaultTreasures} from './world.js';
import {findRoute} from './navigation.js';
import {selectLamp,calculateShadow,isShadowTouchingTreasure,MAX_LAMP_DIST,MIN_SHADOW_LEN,INTERACTION_RADIUS} from './physics.js';
import {stepCarriedObject,LAMP_CARRY_OFFSET,CARRY_SPEED} from './lamp-carry.js';
function setup(){const r=newRoom('LAMP','0');r.playerOrder=['0','1','2','3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r);r.visitors=[];return r;}
function move(r:ReturnType<typeof setup>,p:ReturnType<typeof newPlayer>,to:{x:number;y:number},radius=18){const route=findRoute(p,to,r.walls,radius);assert(route.length,JSON.stringify({p,to,radius}));for(const point of route){let i=0;while(Math.hypot(point.x-p.x,point.y-p.y)>2&&i++<2000){p.input={dx:point.x-p.x,dy:point.y-p.y,at:1000};stepRoom(r,.025,1000);}assert(i<2000,JSON.stringify({to:point,p,l:r.lamps}));}p.input={dx:0,dy:0,at:0};for(let i=0;i<20;i++)stepRoom(r,.025,1000);}
test('Reset lamps cannot reach any treasure from ANY position, even with no obstacles',()=>{
 // For d<=320 the radial hand distance d+length(d) increases to 320+45.
 // Obstruction only shortens it. The forgiving target radius adds 54.
 const bound=MAX_LAMP_DIST+MIN_SHADOW_LEN+INTERACTION_RADIUS;
 for(const l of defaultLamps())for(const t of defaultTreasures())assert(Math.hypot(l.x-t.x,l.y-t.y)>bound,`${l.id} / ${t.id}`);
});
test('All three reset lamps can be carried by ordinary server movement to broad theft arrangements',()=>{
 for(const [i,puzzle]of LAMP_PUZZLES.entries()){
  const r=setup(),p=Object.values(r.players).find(p=>p.role==='thief')!,l=r.lamps[i];
  move(r,p,{x:l.x-44,y:l.y});toggleObject(r,p);assert.equal(p.carryingId,l.id);
  // Wide routes permit the front-mounted lamp to turn without crossing a corner.
  const staging=i===0?[{x:1060,y:370},{x:500,y:370},{x:460,y:244}]:i===1?[{x:200,y:1094}]:[{x:1230,y:380},{x:1230,y:530},{x:1230,y:800},{x:1050,y:894}];
  for(const point of staging){move(r,p,point,i===2||point.y===244?18:58);assert.equal(p.carryingId,l.id,JSON.stringify({i,l,p}));}
  // Last approach points north: establish a predictable front offset.
  move(r,p,{x:puzzle.lamp.x,y:puzzle.lamp.y+44},18);p.heading=Math.PI;for(let j=0;j<30;j++)stepRoom(r,.025,1000);toggleObject(r,p);
  assert(Math.hypot(l.x-puzzle.lamp.x,l.y-puzzle.lamp.y)<8,JSON.stringify({i,l}));
  for(const dx of [-10,0,10])for(const dy of [-10,0,10]){const q={x:puzzle.body.x+dx,y:puzzle.body.y+dy},lamp=selectLamp(q,r.lamps,r.walls);assert(lamp&&isShadowTouchingTreasure(calculateShadow(q,lamp,r.walls),r.treasures[i]),`${i} ${dx} ${dy}`);}
  move(r,p,puzzle.body);p.isStealing=true;for(let j=0;j<125;j++)stepRoom(r,.025,1000);assert(r.treasures[i].stolen,puzzle.id);
 }
});
test('One owner, no grab through walls, capture/lobby/orphan release and replay reset',()=>{
 const r=setup(),[a,b]=Object.values(r.players).filter(p=>p.role==='thief'),l=r.lamps[0];Object.assign(a,{x:l.x-44,y:l.y});Object.assign(b,{x:l.x-40,y:l.y});toggleObject(r,a);toggleObject(r,b);assert.equal(l.holderId,a.id);assert.equal(b.carryingId,null);
 const guard=Object.values(r.players).find(p=>p.role==='guard')!;assert.equal(clientState(r,guard.id).lamps[0].holderId,null);assert.equal(clientState(r,guard.id).players.find(q=>q.badgeNumber===a.badgeNumber)?.carryingId??null,null);
 capture(r,a);assert.equal(l.holderId,null);assert.equal(a.carryingId,null);toggleObject(r,b);assert.equal(l.holderId,b.id);lobby(r);assert.equal(l.holderId,null);startRound(r);assert.deepEqual(r.lamps,defaultLamps());
 const p=Object.values(r.players).find(p=>p.role==='thief')!;r.lamps[0].holderId=p.id;delete r.players[p.id];stepRoom(r,.05,1000);assert.equal(r.lamps[0].holderId,null);
 const blocked=setup(),c=Object.values(blocked.players).find(p=>p.role==='thief')!;Object.assign(c,{x:920,y:600});Object.assign(blocked.lamps[0],{x:960,y:600});toggleObject(blocked,c);assert.equal(c.carryingId,null);
});
test('Bounded lamp motion is independent of camera orbit and stops before thin obstacles; tether cannot cross walls',()=>{
 const lamp={id:'lamp',x:150,y:200,radius:26},holder={x:150,y:244,heading:Math.PI},wall={id:'thin',x:190,y:100,width:3,height:300};
 for(let i=0;i<10;i++)stepCarriedObject(lamp,holder,[wall],[lamp],.05);assert(Math.hypot(lamp.x-150,lamp.y-200)<.001);
 holder.heading=Math.PI/2;let previous={...lamp},blocked=false;for(let i=0;i<40;i++){const result=stepCarriedObject(lamp,holder,[wall],[lamp],.05);blocked ||= result.blocked;assert(Math.hypot(lamp.x-previous.x,lamp.y-previous.y)<=CARRY_SPEED*.05+.001);assert(lamp.x<=176);previous={...lamp};}assert(blocked);
 holder.x=230;assert(stepCarriedObject(lamp,holder,[wall],[lamp],.05).release);assert(lamp.x<190);assert.equal(LAMP_CARRY_OFFSET,44);
});
test('Actual room ticks stop a lamp at cover and deliver only its holder the blocked cue',()=>{
 const r=setup(),p=Object.values(r.players).find(p=>p.role==='thief')!,guard=Object.values(r.players).find(p=>p.role==='guard')!;
 r.staticWalls=[{id:'test_thin_partition',x:190,y:100,width:3,height:300}];r.movables=[];r.lamps=[{id:'lamp_test',x:150,y:244,radius:26}];Object.assign(p,{x:150,y:200});refreshShadows(r);toggleObject(r,p);
 p.input={dx:1,dy:0,at:1000};for(let i=0;i<30;i++)stepRoom(r,.05,1000);
 assert(p.carryBlocked);assert(r.lamps[0].x<=176);assert.equal(clientState(r,p.id).players.find(q=>q.isSelf)?.carryBlocked,true);assert(clientState(r,guard.id).players.every(q=>!q.carryBlocked));
 toggleObject(r,p);assert.equal(r.lamps[0].holderId,null);assert.equal(p.carryBlocked,false);
});
test('Solution arrangements tolerate moving the lamp and body within 20-unit-wide areas, and lamps collide with one another',()=>{
 const r=setup();for(const [i,a]of LAMP_PUZZLES.entries()){
  for(const lx of [-10,0,10])for(const ly of [-10,0,10]){
   Object.assign(r.lamps[i],{x:a.lamp.x+lx,y:a.lamp.y+ly});
   for(const px of [-10,0,10])for(const py of [-10,0,10]){const p={x:a.body.x+px,y:a.body.y+py},lamp=selectLamp(p,r.lamps,r.walls);assert(lamp&&isShadowTouchingTreasure(calculateShadow(p,lamp,r.walls),r.treasures[i]),JSON.stringify({i,lx,ly,px,py}));}
  }
 }
 const l={id:'a',x:100,y:100,radius:26},other={id:'b',x:160,y:100,radius:26};let blocked=false;
 for(let i=0;i<30;i++){const r=stepCarriedObject(l,{x:140,y:100,heading:Math.PI/2},[],[l,other],.05);blocked ||= r.blocked;assert(Math.hypot(l.x-other.x,l.y-other.y)>=28-.001);}assert(blocked);
});
