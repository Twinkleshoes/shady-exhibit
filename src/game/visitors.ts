import type {ServerPlayer,Wall,Vector2D} from '../types/game.js';
import {defaultTreasures,SCULPTURES,PAINTINGS} from './world.js';
import {findRoute,VIEWING_POINTS,VIEWING_EXHIBITS} from './navigation.js';
const routes=new WeakMap<ServerPlayer,Vector2D[]>();
import {lineIntersectsAABB,resolveWallCollisions,PLAYER_RADIUS} from './physics.js';
import {WALK_SPEED,NPC_TURN_RATE} from './settings.js';
export const angleDifference=(to:number,from:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
function nextGoal(p:ServerPlayer,index:number,walls:Wall[]):Vector2D {
 const destinations=VIEWING_POINTS.filter(v=>Math.hypot(v.x-p.x,v.y-p.y)>100);
 // Deterministic round-robin destinations cross gallery/atrium boundaries, with collision-aware rerouting.
 const seed=(index*5+Math.floor(p.x/40)+Math.floor(p.y/40))%destinations.length;
 for(let i=0;i<destinations.length;i++){const route=findRoute(p,destinations[(seed+i)%destinations.length],walls);if(route.length){const first=route.shift()!;routes.set(p,route);return first;}}
 return {x:p.x,y:p.y};
}
export function walkVisitor(p:ServerPlayer,index:number,dt:number,walls:Wall[]) {

 const plan=p.visitorPlan ||= {mode:'pause',goal:{x:p.x,y:p.y},remaining:.4+(index%3)*.4,stuck:0};
 p.walkSpeed=0;p.action='idle';
 if(plan.mode==='pause') {
  p.action='admire';faceExhibit(p,dt,walls);
  plan.remaining-=dt;
  if(plan.remaining<=0){plan.goal=nextGoal(p,index,walls);plan.mode='turn';}
  return;
 }
 const dx=plan.goal.x-p.x,dy=plan.goal.y-p.y,dist=Math.hypot(dx,dy),desired=Math.atan2(dx,dy);
 if(dist<7){const next=routes.get(p)?.shift();if(next){plan.goal=next;plan.mode='turn';}else{plan.mode='pause';plan.remaining=1.5+Math.random()*1.8;}return;}
 const turn=angleDifference(desired,p.heading);p.heading+=Math.sign(turn)*Math.min(Math.abs(turn),NPC_TURN_RATE*dt);
 if(plan.mode==='turn'){if(Math.abs(turn)<.12)plan.mode='walk';return;}
 const distance=Math.min(WALK_SPEED*dt,dist);
 const pos=resolveWallCollisions({x:p.x+dx/dist*distance,y:p.y+dy/dist*distance},PLAYER_RADIUS,walls);
 const moved=Math.hypot(pos.x-p.x,pos.y-p.y);p.x=pos.x;p.y=pos.y;p.walkSpeed=dt>0?Math.min(WALK_SPEED,moved/dt):0;if(p.walkSpeed>1)p.action='walk';
 plan.stuck=moved<distance*.4?plan.stuck+dt:0;
 if(plan.stuck>.35){plan.mode='pause';plan.remaining=.3;plan.stuck=0;}
}

export function faceExhibit(p:ServerPlayer,dt:number,walls:Wall[]){
  // Face the nearest wall display while admiring it, then choose a fresh walking destination.
  const exhibits=[...VIEWING_EXHIBITS.map(v=>v.look),...defaultTreasures(),...SCULPTURES,...PAINTINGS].filter(v=>{const distance=Math.hypot(v.x-p.x,v.y-p.y);return !walls.some(w=>{const ray=lineIntersectsAABB(p,v,w);return ray.hit&&ray.distance<distance-60;});});
  const exhibit=exhibits.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||{x:p.x+Math.sin(p.heading),y:p.y+Math.cos(p.heading)};
  const desired=Math.atan2(exhibit.x-p.x,exhibit.y-p.y);
  const delta=angleDifference(desired,p.heading);p.heading+=Math.sign(delta)*Math.min(Math.abs(delta),NPC_TURN_RATE*dt);
}
