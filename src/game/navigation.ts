import type {Vector2D,Wall} from '../types/game.js';
import {WORLD_WIDTH,WORLD_HEIGHT} from './world.js';
import {lineIntersectsAABB,PLAYER_RADIUS} from './physics.js';
// A destination is paired with a real exhibit or seating feature, rather than
// a random corridor coordinate. The same look-at list drives the admire action.
export const VIEWING_EXHIBITS=[
 {stand:{x:920,y:265},look:{x:858,y:270},name:'Light and mineral interpretation'},
 {stand:{x:365,y:690},look:{x:305,y:688},name:'Folded Strata sculpture'},
 {stand:{x:1307,y:785},look:{x:1307,y:715},name:'Travel and exchange cabinet'},
 {stand:{x:220,y:180},look:{x:140,y:180},name:'Continuum bronze'},
 {stand:{x:550,y:110},look:{x:450,y:110},name:'Mineral case'},
 {stand:{x:870,y:110},look:{x:1000,y:110},name:'Crystal case'},
 {stand:{x:580,y:220},look:{x:700,y:200},name:'Royal Sapphire'},
 {stand:{x:1260,y:160},look:{x:1325,y:105},name:'Introduction artifacts'},
 {stand:{x:200,y:630},look:{x:105,y:750},name:'Stone bust'},
 {stand:{x:230,y:1100},look:{x:100,y:1020},name:'Celestial form'},
 {stand:{x:220,y:920},look:{x:200,y:830},name:'Bronze Sun'},
 {stand:{x:1180,y:1150},look:{x:1397,y:1160},name:'Trade routes illustration'},
 {stand:{x:1200,y:920},look:{x:1210,y:850},name:'Imperial Seal'},
 {stand:{x:1250,y:650},look:{x:1397,y:620},name:'Architecture illustration'},
 {stand:{x:1160,y:570},look:{x:1060,y:600},name:'Ancient vessels'},
 {stand:{x:1180,y:950},look:{x:1305,y:1025},name:'Early settlements'},
 {stand:{x:600,y:650},look:{x:700,y:700},name:'Confluence sculpture'},
 {stand:{x:800,y:790},look:{x:700,y:700},name:'Confluence sculpture'},
 {stand:{x:570,y:910},look:{x:524,y:890},name:'Atrium seating'},
 {stand:{x:820,y:910},look:{x:874,y:890},name:'Atrium seating'},
 {stand:{x:700,y:1190},look:{x:700,y:1250},name:'Reception'},
];
export const VIEWING_POINTS:Vector2D[]=VIEWING_EXHIBITS.map(v=>v.stand);
export function clearPath(a:Vector2D,b:Vector2D,walls:Wall[],radius=PLAYER_RADIUS){return !walls.some(w=>lineIntersectsAABB(a,b,{x:w.x-radius,y:w.y-radius,width:w.width+radius*2,height:w.height+radius*2}).hit);}
// Shared deterministic 40px grid. Every edge is checked against expanded ACTUAL solid geometry.
export function findRoute(start:Vector2D,end:Vector2D,walls:Wall[],radius=PLAYER_RADIUS):Vector2D[]{
 if(clearPath(start,end,walls,radius))return [end];
 const step=40,nx=Math.floor(WORLD_WIDTH/step),ny=Math.floor(WORLD_HEIGHT/step),points=new Map<number,Vector2D>();
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const p={x:20+x*step,y:20+y*step};if(clearPath(p,p,walls,radius))points.set(y*nx+x,p);}
 const nearest=(p:Vector2D)=>[...points].sort((a,b)=>Math.hypot(a[1].x-p.x,a[1].y-p.y)-Math.hypot(b[1].x-p.x,b[1].y-p.y)).find(([,q])=>clearPath(p,q,walls,radius))?.[0];
 const first=nearest(start),last=nearest(end);if(first===undefined||last===undefined)return [];
 const queue=[first],parent=new Map<number,number>();parent.set(first,-1);
 for(let i=0;i<queue.length&&!parent.has(last);i++){const id=queue[i],p=points.get(id)!;for(const k of [id-1,id+1,id-nx,id+nx]){const q=points.get(k);if(q&&!parent.has(k)&&Math.hypot(q.x-p.x,q.y-p.y)<step+1&&clearPath(p,q,walls,radius)){parent.set(k,id);queue.push(k);}}}
 if(!parent.has(last))return [];const route:Vector2D[]=[end];for(let k=last;k!==-1;k=parent.get(k)!)route.unshift(points.get(k)!);
 // Shortcut only where the same body clearance permits it.
 const result:Vector2D[]=[];let from=start;while(route.length){let i=route.length-1;while(i>0&&!clearPath(from,route[i],walls,radius))i--;from=route[i];result.push(from);route.splice(0,i+1);}return result;
}
