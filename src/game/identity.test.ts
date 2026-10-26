import test from 'node:test';import assert from 'node:assert/strict';
import {newRoom,newPlayer,startRound,markSceneReady,stepRoom,clientState,capture,refreshShadows,targetFor,inspect,lobby} from './engine.js';
import {PUBLIC_SPAWNS,THIEF_SPAWN_CHOICES,RELEASE_SPAWNS,ESCAPE,HOLDING,inside,roomName} from './world.js';
import {CAMERAS,visibleOnCamera} from './cameras.js';import {resolveWallCollisions} from './physics.js';import {findRoute} from './navigation.js';
function fixture(wait=false){const r=newRoom('ID','p0');r.playerOrder=['p0','p1','p2','p3'];for(const id of r.playerOrder)r.players[id]=newPlayer(id,id);startRound(r,wait);return r;}
function thieves(r:ReturnType<typeof fixture>){return Object.values(r.players).filter(p=>p.role==='thief');}
function rescue(r:ReturnType<typeof fixture>,actor:ReturnType<typeof thieves>[number]){
 const t=r.switches[0];let found=false;for(let y=t.y-190;y<t.y+190&&!found;y+=5)for(let x=t.x-190;x<t.x+190&&!found;x+=5){const safe=resolveWallCollisions({x,y},18,r.walls);if(Math.hypot(safe.x-x,safe.y-y)>.01)continue;actor.x=x;actor.y=y;refreshShadows(r);found=targetFor(r,actor)?.id===t.id;}assert(found);actor.isStealing=true;for(let i=0;i<61;i++)stepRoom(r,.05,1000);
}
test('Rescue changes both disguises atomically, retires badges, clears targeting and preserves private identity',()=>{
 const r=fixture(),[a,b,c]=thieves(r),g=Object.values(r.players).find(p=>p.role==='guard')!;
 const original=[b,c].map(p=>({id:p.id,socket:p.socketId,role:p.role,badge:p.badgeNumber,look:p.appearanceId,key:p.shadowKey}));
 capture(r,b);capture(r,c);r.activeInspection={targetId:b.id,elapsed:.2};b.isInspected=true;const charges=r.guardCharges;
 rescue(r,a);assert.equal(r.activeInspection,null);assert.equal(r.guardCharges,charges);
 for(const [i,p]of [b,c].entries()){const o=original[i];assert.equal(p.id,o.id);assert.equal(p.socketId,o.socket);assert.equal(p.role,o.role);assert.notEqual(p.badgeNumber,o.badge);assert.notEqual(p.appearanceId,o.look);assert.notEqual(p.shadowKey,o.key);assert(!p.isCaptured&&!p.isInspected&&!p.isStealing);assert.deepEqual(p.input,{dx:0,dy:0,at:0});assert(r.usedBadges.includes(o.badge));assert(!inspect(r,o.badge));}
 const all=[...Object.values(r.players),...r.visitors];assert.equal(new Set(all.map(p=>p.badgeNumber)).size,all.length);assert.equal(new Set(r.usedBadges).size,r.usedBadges.length);
 const guard=clientState(r,g.id);for(const p of [b,c]){assert(!guard.players.some(v=>v.badgeNumber===p.badgeNumber));assert(!guard.players.some(v=>original.some(o=>o.badge===v.badgeNumber)));assert(!JSON.stringify(guard.guard).includes(String(p.badgeNumber)));}
 for(const p of [a,b,c])for(const q of [b,c]){const seen=clientState(r,p.id).players.find(v=>v.id===q.id)!;assert.equal(seen.badgeNumber,q.badgeNumber);assert.equal(seen.appearanceId,q.appearanceId);assert.equal(!!seen.isTeammate,p!==q);assert.equal(seen.isSelf,p===q);}
 const stable=[b,c].map(p=>[p.badgeNumber,p.appearanceId]);for(let i=0;i<40;i++)stepRoom(r,.05,1000);assert.deepEqual([b,c].map(p=>[p.badgeNumber,p.appearanceId]),stable);
 const last=b.badgeNumber,look=b.appearanceId;capture(r,b);rescue(r,a);assert.notEqual(b.badgeNumber,last);assert.notEqual(b.appearanceId,look);assert(r.usedBadges.includes(last));
});
test('Concealed release spots hide the full visitor across all feeds, legal pans and maximum aspect',()=>{
 const r=fixture();assert(Math.hypot(RELEASE_SPAWNS[0].x-RELEASE_SPAWNS[1].x,RELEASE_SPAWNS[0].y-RELEASE_SPAWNS[1].y)>=36);
 for(const p of RELEASE_SPAWNS){assert(!inside(p,HOLDING)&&!inside(p,ESCAPE));assert.deepEqual(resolveWallCollisions(p,18,r.walls),p);assert(findRoute(p,{x:700,y:1190},r.walls).length);
 }
 const held=thieves(r);held.forEach(p=>capture(r,p));
 for(const p of [...RELEASE_SPAWNS,...held])for(const c of CAMERAS)for(let pan=-Math.PI*50/180;pan<=Math.PI*50/180+.00001;pan+=Math.PI/180)for(const dx of [-18,0,18])for(const dy of [-18,0,18])for(const h of [.5,1.2,2.1])assert(!visibleOnCamera({x:p.x+dx,y:p.y+dy},c.id,r.staticWalls,3,h,pan),`${c.id} ${pan} ${JSON.stringify({x:p.x,y:p.y})}`);
});
test('Thieves start separated in public NPC-populated galleries, safe and outside initial CCTV view',()=>{
 const check=fixture();for(const i of THIEF_SPAWN_CHOICES.flat()){const p=PUBLIC_SPAWNS[i];for(const dx of [-18,0,18])for(const dy of [-18,0,18])for(const h of [.5,1.2,2.1])assert(!visibleOnCamera({x:p.x+dx,y:p.y+dy},'cam_01',check.staticWalls,3,h,0));}
 for(let round=0;round<12;round++){const r=fixture(),ts=thieves(r);assert.deepEqual([...ts,...r.visitors].map(p=>p.x+','+p.y).sort(),PUBLIC_SPAWNS.map(p=>p.x+','+p.y).sort());assert.equal(new Set(ts.map(roomName)).size,3);for(const p of ts){assert(PUBLIC_SPAWNS.some(s=>s.x===p.x&&s.y===p.y));assert(!inside(p,HOLDING));assert.deepEqual(resolveWallCollisions(p,18,r.walls),{x:p.x,y:p.y});assert(r.treasures.every(t=>Math.hypot(t.x-p.x,t.y-p.y)>200));assert(r.visitors.filter(v=>roomName(v)===roomName(p)&&Math.hypot(v.x-p.x,v.y-p.y)<200).length>=2);for(const dx of [-18,0,18])for(const dy of [-18,0,18])for(const h of [.5,1.2,2.1])assert(!visibleOnCamera({x:p.x+dx,y:p.y+dy},'cam_01',r.walls,3,h,0));for(const q of ts)if(q!==p)assert(Math.hypot(p.x-q.x,p.y-q.y)>400);}}
});
test('Round loading barrier waits for all four current scenes, freezes time, rejects stale ready messages and resets on replay',()=>{
 const r=fixture(true),id=r.roundId;assert.equal(r.status,'loading');assert.equal(r.visitors.length,9);assert.equal(new Set([...thieves(r),...r.visitors].map(p=>p.badgeNumber)).size,12);stepRoom(r,40);assert.equal(r.roundTimeLeft,360);assert(!clientState(r,r.playerOrder[0]).guard.isCameraLive);
 assert(!markSceneReady(r,'outsider',id));assert(!markSceneReady(r,r.playerOrder[0],'old'));for(const p of r.playerOrder.slice(0,3)){assert(markSceneReady(r,p,id));assert(!markSceneReady(r,p,id));}assert.equal(r.readyPlayerIds.length,3);assert.equal(r.status,'loading');markSceneReady(r,r.playerOrder[3],id);assert.equal(r.status,'briefing');
 const oldGuard=r.guardIndex;capture(r,thieves(r)[0]);lobby(r);assert.deepEqual(r.usedBadges,[]);assert.deepEqual(r.readyPlayerIds,[]);startRound(r,true);assert.notEqual(r.roundId,id);assert.notEqual(r.guardIndex,oldGuard);assert(!markSceneReady(r,r.playerOrder[0],id));assert.equal(r.usedBadges.length,13);assert(thieves(r).every(p=>!p.isCaptured&&PUBLIC_SPAWNS.some(s=>s.x===p.x&&s.y===p.y)));assert.equal(r.guardCharges,3);assert.equal(r.activeInspection,null);
});
