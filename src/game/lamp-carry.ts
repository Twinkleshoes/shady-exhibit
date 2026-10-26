import type {Lamp,Vector2D,Wall} from '../types/game.js';
import type {Movable} from './world.js';
import {lineIntersectsAABB} from './physics.js';
export const GRAB_RANGE=65,LAMP_CARRY_OFFSET=44,CARRY_SPEED=180,LAMP_COLLISION_RADIUS=14;
export function availableObjects(p:Vector2D,lamps:Lamp[],movables:Movable[],walls:Wall[]){
 return [...lamps.map(item=>({id:item.id,pos:item,item})),...movables.map(item=>({id:item.id,pos:{x:item.x+item.width/2,y:item.y+item.height/2},item}))]
 .filter(c=>!c.item.holderId&&Math.hypot(c.pos.x-p.x,c.pos.y-p.y)<GRAB_RANGE&&!walls.some(w=>w.id!==c.id&&lineIntersectsAABB(p,c.pos,w).hit))
 .sort((a,b)=>Number(!a.id.startsWith('lamp_'))-Number(!b.id.startsWith('lamp_'))||Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y));
}
/** Sweep a conservative expanded footprint; never resolve a penetrated endpoint to the far side. */
export function stepCarriedObject(item:Lamp|Movable,holder:Vector2D&{heading:number},walls:Wall[],lamps:Lamp[],dt:number){
 const prop='width'in item,hx=prop?item.width/2:0,hy=prop?item.height/2:0,radius=prop?Math.hypot(hx,hy):LAMP_COLLISION_RADIUS;
 const center={x:item.x+hx,y:item.y+hy};
 const obstacles=walls.filter(w=>w.id!==item.id);
 for(const l of lamps)if(l.id!==item.id)obstacles.push({id:l.id,x:l.x-14,y:l.y-14,width:28,height:28});
 // A holder cannot tow an object around a wall/corner on an invisible tether.
 if(obstacles.some(w=>lineIntersectsAABB(holder,center,w).hit))return {blocked:true,release:true};
 const offset=prop?58:LAMP_CARRY_OFFSET,desired={x:holder.x+Math.sin(holder.heading)*offset,y:holder.y+Math.cos(holder.heading)*offset};
 const dx=desired.x-center.x,dy=desired.y-center.y,d=Math.hypot(dx,dy),travel=Math.min(d,CARRY_SPEED*Math.max(0,Math.min(dt,.1))),n=Math.max(1,Math.ceil(travel/3));
 let pos=center,blocked=false;
 for(let i=0;i<n&&d>.001;i++){
  const next={x:pos.x+dx/d*travel/n,y:pos.y+dy/d*travel/n};
  if(next.x<radius||next.y<radius||next.x>1400-radius||next.y>1400-radius||obstacles.some(w=>lineIntersectsAABB(pos,next,{x:w.x-radius,y:w.y-radius,width:w.width+2*radius,height:w.height+2*radius}).hit)){blocked=true;break;}
  pos=next;
 }
 item.x=pos.x-hx;item.y=pos.y-hy;
 return {blocked,release:Math.hypot(pos.x-holder.x,pos.y-holder.y)>100};
}
