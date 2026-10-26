import type {GameRoom,ServerPlayer,Vector2D} from '../types/game.js';
import {findRoute,clearPath} from './navigation.js';
import {resolveWallCollisions,PLAYER_RADIUS} from './physics.js';
import {WALK_SPEED,NPC_TURN_RATE} from './settings.js';
import {angleDifference} from './visitors.js';
import {TOUR_MEETING,TOUR_SPOTS,TOUR_MIN_TRAVEL,TOUR_MAX_TRAVEL,TOUR_GATHER_SECONDS,tourActive} from './tour-shared.js';
import type {TourPublic} from './tour-shared.js';
export {TOUR_MEETING,TOUR_SPOTS,TOUR_MIN_TRAVEL,TOUR_MAX_TRAVEL,TOUR_GATHER_SECONDS,tourActive} from './tour-shared.js';
interface TourOrder {delay:number;spot:Vector2D;arrived:boolean;retry:number;stuck:number;}
export interface TourState extends TourPublic {orders:Record<string,TourOrder>;}
const paths=new WeakMap<ServerPlayer,Vector2D[]>();
export const emptyTour=():TourState=>({used:false,phase:'idle',elapsed:0,gatherRemaining:0,orders:{}});
export function publicTour(t:TourState):TourPublic{return {used:t.used,phase:t.phase,elapsed:t.elapsed,gatherRemaining:t.gatherRemaining};}
export function cancelTour(room:GameRoom){
 for(const p of room.visitors){paths.delete(p);p.visitorPlan=undefined;}
 room.tour.orders={};room.tour.gatherRemaining=0;if(room.tour.used)room.tour.phase='finished';
}
export function announceTour(room:GameRoom,playerId:string){
 if(room.status!=='playing'||room.players[playerId]?.role!=='guard'||room.tour.used)return false;
 const spots=TOUR_SPOTS.filter(p=>clearPath(p,p,room.walls,PLAYER_RADIUS));
 if(spots.length<12)return false; // Never spend the ability on an obstructed meeting area.
 const available=[...spots],orders:TourState['orders']={};
 for(const [i,p]of room.visitors.entries()){
  const index=available.findIndex(s=>findRoute(p,s,room.walls).length>0);if(index<0)return false;
  orders[p.id]={delay:1+3*(i/(Math.max(1,room.visitors.length-1))),spot:available.splice(index,1)[0],arrived:false,retry:0,stuck:0};
 }
 // Atomic claim: repeated packets cannot spend or restart it twice.
 room.tour={used:true,phase:'travelling',elapsed:0,gatherRemaining:0,orders};
 return true;
}
export function tickTour(room:GameRoom,dt:number){
 const t=room.tour;if(!tourActive(t))return;
 t.elapsed+=dt;
 if(t.phase==='travelling'){
  if(t.elapsed>=TOUR_MAX_TRAVEL||(t.elapsed>=TOUR_MIN_TRAVEL&&Object.values(t.orders).every(o=>o.arrived))){t.phase='gathering';t.gatherRemaining=TOUR_GATHER_SECONDS;}
 }else{t.gatherRemaining=Math.max(0,t.gatherRemaining-dt);if(t.gatherRemaining===0)cancelTour(room);}
}
/** Only NPCs call this. Neither player inputs nor player action/role flags are modified. */
export function tourVisitor(room:GameRoom,p:ServerPlayer,dt:number){
 const t=room.tour,o=t.orders[p.id];if(!tourActive(t)||!o)return false;
 if(t.elapsed<o.delay)return false;
 p.visitorPlan=undefined;p.walkSpeed=0;p.action='idle';o.retry=Math.max(0,o.retry-dt);
 if(!clearPath(o.spot,o.spot,room.walls,PLAYER_RADIUS)){
  const replacement=TOUR_SPOTS.find(s=>clearPath(s,s,room.walls,PLAYER_RADIUS)&&Object.values(t.orders).every(other=>other===o||Math.hypot(other.spot.x-s.x,other.spot.y-s.y)>=60)&&findRoute(p,s,room.walls).length);
  if(replacement){o.spot={...replacement};o.arrived=false;paths.delete(p);o.retry=0;}
 }
 if(Math.hypot(p.x-o.spot.x,p.y-o.spot.y)<4){o.arrived=true;paths.delete(p);return true;}
 o.arrived=false;
 let path=paths.get(p);
 // Check live movable geometry on every edge, and retry boundedly if a route is blocked.
 if(!path?.length||!clearPath(p,path[0],room.walls,PLAYER_RADIUS)){
  if(o.retry>0)return true;
  path=findRoute(p,o.spot,room.walls);paths.set(p,path);o.retry=.5;
 }
 if(!path.length)return true;
 while(path.length&&Math.hypot(path[0].x-p.x,path[0].y-p.y)<3)path.shift();
 if(!path.length)return true;
 const q=path[0],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),turn=angleDifference(Math.atan2(dx,dy),p.heading);
 p.heading+=Math.sign(turn)*Math.min(Math.abs(turn),NPC_TURN_RATE*dt);
 if(Math.abs(turn)>.2)return true;
 const distance=Math.min(WALK_SPEED*dt,d),safe=resolveWallCollisions({x:p.x+dx/d*distance,y:p.y+dy/d*distance},PLAYER_RADIUS,room.walls),moved=Math.hypot(safe.x-p.x,safe.y-p.y);
 p.x=safe.x;p.y=safe.y;p.walkSpeed=dt>0?Math.min(WALK_SPEED,moved/dt):0;p.action=p.walkSpeed>1?'walk':'idle';
 o.stuck=moved<distance*.4?o.stuck+dt:0;if(o.stuck>.35){paths.delete(p);o.stuck=0;}
 return true;
}
