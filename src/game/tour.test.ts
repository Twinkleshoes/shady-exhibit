import test from 'node:test';import assert from 'node:assert/strict';
import {newRoom,newPlayer,startRound,stepRoom,clientState,capture,lobby,toggleObject} from './engine.js';
import {announceTour,TOUR_SPOTS,tourActive,TOUR_MAX_TRAVEL,TOUR_GATHER_SECONDS} from './tour.js';
import {findRoute,clearPath} from './navigation.js';import {WALK_SPEED} from './settings.js';
function fixture(){const r=newRoom('TOUR','0');r.playerOrder=['0','1','2','3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r);return r;}
const guard=(r:ReturnType<typeof fixture>)=>Object.values(r.players).find(p=>p.role==='guard')!;
test('Guard-only tour is atomic and single-use, while public state reveals no assignments or classifications',()=>{
 const r=fixture(),thief=Object.values(r.players).find(p=>p.role==='thief')!,g=guard(r);assert(!announceTour(r,thief.id));assert(!announceTour(r,'unknown'));assert(announceTour(r,g.id));const orders=r.tour.orders;assert(!announceTour(r,g.id));assert.equal(r.tour.orders,orders);
 for(const id of r.playerOrder){const s=clientState(r,id);assert.deepEqual(s.tour,{used:true,phase:'travelling',elapsed:0,gatherRemaining:0});assert(!('orders'in s.tour));assert(!JSON.stringify(s.tour).includes(r.visitors[0].id));}
 assert(clientState(r,g.id).players.every(p=>!p.isTeammate&&p.carryingId===null&&p.name.startsWith('Suspect #')));
});
test('Meeting area has capacity for all 12 visitors, distinct spaced reachable slots and varied 1–4 second reactions',()=>{
 const r=fixture();assert(TOUR_SPOTS.filter(s=>clearPath(s,s,r.walls)).length>=12);assert(announceTour(r,guard(r).id));
 const orders=Object.values(r.tour.orders);assert.equal(orders.length,9);assert.equal(new Set(orders.map(o=>`${o.spot.x},${o.spot.y}`)).size,9);assert.equal(Math.min(...orders.map(o=>o.delay)),1);assert.equal(Math.max(...orders.map(o=>o.delay)),4);assert(new Set(orders.map(o=>o.delay)).size>=5);
 for(const p of r.visitors){const o=r.tour.orders[p.id];assert(findRoute(p,o.spot,r.walls).length);for(const other of orders)if(other!==o)assert(Math.hypot(o.spot.x-other.spot.x,o.spot.y-other.spot.y)>=60);}
 // A paused NPC cannot react to the tour before its individual delay.
 const slow=r.visitors.at(-1)!;slow.visitorPlan={mode:'pause',goal:{x:slow.x,y:slow.y},remaining:10,stuck:0};const pos={x:slow.x,y:slow.y};for(let i=0;i<75;i++)stepRoom(r,.05,1000);assert.deepEqual({x:slow.x,y:slow.y},pos);assert.equal(r.tour.orders[slow.id].arrived,false);
});
test('NPCs gather at shared speed, do not overlap standing spots, wait 18 seconds, then browse again',()=>{
 const r=fixture();assert(announceTour(r,guard(r).id));let walked=false,gatherAt=0,previous='travelling';
 for(let i=0;i<1500&&tourActive(r.tour);i++){
  stepRoom(r,.05,1000);for(const p of r.visitors){assert(p.walkSpeed<=WALK_SPEED+.001);walked ||= p.walkSpeed>WALK_SPEED-.01;assert(clearPath(p,p,r.walls,17.9));}
  if(r.tour.phase==='gathering'&&previous==='travelling'){gatherAt=r.tour.elapsed;assert(gatherAt>=8&&gatherAt<=55.1);assert(Object.values(r.tour.orders).every(o=>o.arrived),'Every NPC arrived on the unchanged map');assert(r.tour.gatherRemaining>=17.99);for(const [i,a]of r.visitors.entries())for(const b of r.visitors.slice(i+1))assert(Math.hypot(a.x-b.x,a.y-b.y)>50);}
  previous=r.tour.phase;
 }
 assert(walked&&gatherAt>0);assert.equal(r.tour.phase,'finished');assert(r.tour.elapsed-gatherAt>=17.95);assert.deepEqual(r.tour.orders,{});let browsing=false;for(let i=0;i<100;i++){stepRoom(r,.05,1000);browsing ||= r.visitors.some(p=>p.visitorPlan?.mode==='walk');}assert(browsing);
});
test('Movable obstacles reroute destinations; blocked NPC cannot stall the bounded travel/gather timers',()=>{
 const r=fixture();announceTour(r,guard(r).id);const p=r.visitors[0],old={...r.tour.orders[p.id].spot};const prop=r.movables[0];Object.assign(prop,{x:old.x-20,y:old.y-25});for(let i=0;i<25;i++)stepRoom(r,.05,1000);assert.notDeepEqual(r.tour.orders[p.id].spot,old);
 // An unreachable target after activation must not extend travel beyond the deadline.
 const order=r.tour.orders[p.id];order.spot={x:-500,y:-500};r.tour.elapsed=TOUR_MAX_TRAVEL-.02;stepRoom(r,.05,1000);assert.equal(r.tour.phase,'gathering');assert.equal(r.tour.gatherRemaining,TOUR_GATHER_SECONDS);for(let i=0;i<365;i++)stepRoom(r,.05,1000);assert.equal(r.tour.phase,'finished');
});
test('Thieves retain input/lamps/actions, captives stay put, and ending/lobby/replay cancels all event state',()=>{
 const r=fixture(),[a,b]=Object.values(r.players).filter(p=>p.role==='thief');capture(r,b);const pos={x:b.x,y:b.y};Object.assign(a,{x:800,y:790});a.input={dx:1,dy:0,at:1000};announceTour(r,guard(r).id);const camera=r.cameraId;stepRoom(r,.1,1000);assert(a.x>800);assert.deepEqual({x:b.x,y:b.y},pos);assert.equal(r.cameraId,camera);
 r.roundTimeLeft=.01;stepRoom(r,.05,1000);assert.equal(r.status,'gameover');assert(!tourActive(r.tour));assert.deepEqual(r.tour.orders,{});lobby(r);assert.equal(r.tour.used,false);startRound(r);assert.equal(r.tour.used,false);assert.equal(r.tour.phase,'idle');assert.deepEqual(r.tour.orders,{});
});
test('Tour cue uses three brief tones only after gesture unlock and respects mute',async()=>{
 const {SoundEffects}=await import('../utils/audio.js');const old=(globalThis as any).window;let tones=0;
 const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 class FakeAudioContext {currentTime=0;state='running';destination={};resume(){return Promise.resolve();}close(){return Promise.resolve();}createOscillator(){return {type:'',frequency:param(),connect(){},disconnect(){},start(){tones++;},stop(){}};}createGain(){return {gain:param(),connect(){}};}}
 (globalThis as any).window={AudioContext:FakeAudioContext};const sound=new SoundEffects();try{sound.playTourAnnouncement();assert.equal(tones,0);await sound.unlock();sound.setMuted(true);sound.playTourAnnouncement();assert.equal(tones,0);sound.setMuted(false);sound.playTourAnnouncement();assert.equal(tones,3);sound.setMuted(true);sound.playTourAnnouncement();assert.equal(tones,3);}finally{sound.dispose();(globalThis as any).window=old;}
});

test('Tour preserves lamp carrying and normal theft; active lobby abort and thief victory clean up the tour',()=>{
 const r=fixture(),p=Object.values(r.players).find(p=>p.role==='thief')!,lamp=r.lamps[0];Object.assign(p,{x:lamp.x-44,y:lamp.y});toggleObject(r,p);assert.equal(p.carryingId,lamp.id);announceTour(r,guard(r).id);p.input={dx:-1,dy:0,at:1000};for(let i=0;i<20;i++)stepRoom(r,.05,1000);assert.equal(p.carryingId,lamp.id);assert(lamp.x<1050);toggleObject(r,p);
 Object.assign(lamp,{x:460,y:200});Object.assign(p,{x:590,y:200,input:{dx:0,dy:0,at:0},isStealing:true});for(let i=0;i<63;i++)stepRoom(r,.05,1000);assert(r.treasures[0].stolen);assert(tourActive(r.tour));lobby(r);assert.equal(r.tour.phase,'idle');assert.deepEqual(r.tour.orders,{});
 startRound(r);announceTour(r,guard(r).id);for(const t of r.treasures)t.stolen=true;for(const t of Object.values(r.players).filter(p=>p.role==='thief'))Object.assign(t,{x:850,y:1120});stepRoom(r,.05,1000);assert.equal(r.winner,'thieves');assert.equal(r.tour.phase,'finished');assert.deepEqual(r.tour.orders,{});
});
