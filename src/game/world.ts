import type {Lamp,Treasure,Wall,Vector2D} from '../types/game.js';
export const WORLD_WIDTH=1400, WORLD_HEIGHT=1400;
export const ROOMS=[
 {id:'gem',name:'Gem Gallery',x:350,y:0,width:800,height:460,color:0xb7ceda,ceiling:4.8},
 {id:'sculpture',name:'Sculpture Gallery',x:0,y:460,width:460,height:940,color:0xd4c8ba,ceiling:5.6},
 {id:'history',name:'History Gallery',x:940,y:460,width:460,height:940,color:0xc9cfb9,ceiling:4.65},
 {id:'atrium',name:'Central Atrium',x:460,y:460,width:480,height:740,color:0xe7dfd0,ceiling:8.2},
 {id:'south',name:'South Connection',x:460,y:1200,width:480,height:200,color:0xe0d9cc,ceiling:4.65},
 {id:'sculpture-study',name:'Sculpture Study Bay',x:0,y:0,width:350,height:460,color:0xd4c8ba,ceiling:5.6},
 {id:'history-intro',name:'History Introduction Bay',x:1150,y:0,width:250,height:460,color:0xc9cfb9,ceiling:4.65},
];
export const GALLERIES=ROOMS.slice(0,3);
export const SCULPTURES=[{x:700,y:700,height:4.0},{x:105,y:750,height:2.4},{x:340,y:960,height:3.85},{x:100,y:1020,height:2.05},{x:140,y:180,height:3.7}];
export const PAINTINGS=[420,660,900,1070].map(x=>({x,y:6}));
// Separated public gallery starts; the initial atrium camera cannot see these.
export const SPAWNS=[{x:1030,y:320},{x:320,y:600},{x:1270,y:1180}];
export const NPC_SPAWNS=[{x:950,y:320},{x:920,y:370},{x:160,y:600},{x:240,y:620},{x:1190,y:1180},{x:1270,y:1100},{x:600,y:650},{x:800,y:790},{x:760,y:1300}];
// Shared player/NPC starting slots. Gallery allocation chooses one safe thief
// per gallery; every remaining slot is occupied by an ordinary visitor.
export const PUBLIC_SPAWNS=[...SPAWNS,...NPC_SPAWNS];
export const THIEF_SPAWN_CHOICES=[[0,3,4],[1,5,6],[2,7,8]];
export const HOLDING={x:480,y:980,width:160,height:140};
// At most two thieves can be rescued while another holds the switch. These
// existing privacy-corridor spots conceal the whole visitor at every legal pan.
export const RELEASE_SPAWNS=[{x:732,y:1045},{x:718,y:1085}];
export const ESCAPE={x:790,y:1040,width:130,height:130};
export const DOORWAYS=[
 {id:'gem-west-bay',x:350,y:340,a:{x:300,y:340},b:{x:400,y:340}},
 {id:'gem-east-bay',x:1150,y:340,a:{x:1100,y:340},b:{x:1200,y:340}},
 {id:'gem-atrium',x:700,y:460,a:{x:700,y:410},b:{x:700,y:510}},
 {id:'gem-sculpture',x:220,y:460,a:{x:220,y:410},b:{x:220,y:510}},
 {id:'gem-history',x:1230,y:460,a:{x:1230,y:410},b:{x:1230,y:510}},
 {id:'atrium-sculpture',x:460,y:740,a:{x:420,y:740},b:{x:510,y:740}},
 {id:'atrium-history',x:940,y:740,a:{x:890,y:740},b:{x:990,y:740}},
 {id:'sculpture-south',x:460,y:1300,a:{x:410,y:1300},b:{x:510,y:1300}},
 {id:'history-south',x:940,y:1300,a:{x:890,y:1300},b:{x:990,y:1300}},
];
export function inside(pos:Vector2D,box:{x:number;y:number;width:number;height:number}) {return pos.x>=box.x&&pos.x<=box.x+box.width&&pos.y>=box.y&&pos.y<=box.y+box.height;}
export function roomName(pos:Vector2D) {return inside(pos,HOLDING)?'Security Holding':ROOMS.find(g=>inside(pos,g))?.name||'Museum';}
export function defaultLamps():Lamp[] {return [
 {id:'lamp_gem',x:1100,y:380,radius:26},
 {id:'lamp_sculpture',x:200,y:1300,radius:26},
 {id:'lamp_history',x:1300,y:380,radius:26},
 {id:'lamp_rescue',x:700,y:1140,radius:26},
];}
export function defaultTreasures():Treasure[] {return [
 {id:'treasure_gem',name:'Royal Sapphire',x:700,y:200,radius:24,stolen:false,room:'Gem Gallery'},
 {id:'treasure_sculpture',name:'Bronze Sun',x:200,y:830,radius:24,stolen:false,room:'Sculpture Gallery'},
 {id:'treasure_history',name:'Imperial Seal',x:1210,y:850,radius:24,stolen:false,room:'History Gallery'},
];}
export interface Movable {id:string;x:number;y:number;width:number;height:number;holderId:string|null;}
export interface Switch {id:string;kind:'rescue'|'camera';name:string;x:number;y:number;cameraId?:string;cooldown:number;}
export function defaultSwitches():Switch[] {return [
 {id:'rescue',kind:'rescue',name:'Release Security Holding',x:700,y:900,cooldown:0},
 {id:'disrupt_gem',kind:'camera',name:'Gem Gallery camera',x:780,y:360,cameraId:'cam_02',cooldown:0},
 {id:'disrupt_sculpture',kind:'camera',name:'Sculpture Gallery camera',x:350,y:1160,cameraId:'cam_04',cooldown:0},
 {id:'disrupt_history',kind:'camera',name:'History Gallery camera',x:1080,y:1080,cameraId:'cam_06',cooldown:0},
];}
export function defaultMovables():Movable[] {return [
 {id:'display_gem',x:500,y:250,width:40,height:50,holderId:null},
 {id:'display_sculpture',x:310,y:780,width:40,height:50,holderId:null},
 {id:'display_history',x:1000,y:950,width:40,height:50,holderId:null},
];}
export function wallHeight(w:Wall) {return w.elevation ?? (w.id.startsWith('pillar')?5:w.id.startsWith('bench')?.55:w.id.startsWith('pedestal')?1.2:2.2);}
// Decorative solids stay entirely inside existing furnishing footprints. Their
// height is shared with CCTV and third-person camera obstruction.
export const FINISH_DETAILS=[
 {id:'detail_sculpture_study',x:118,y:158,width:44,height:44,elevation:3.7,baseHeight:.7,kind:'study'},
 {id:'detail_sculpture_bust',x:94,y:739,width:22,height:22,elevation:2.4,baseHeight:1.15,kind:'bust'},
 {id:'detail_sculpture_obelisk',x:328,y:948,width:24,height:24,elevation:3.85,baseHeight:1.15,kind:'obelisk'},
 {id:'detail_sculpture_orb',x:88,y:1008,width:24,height:24,elevation:2.05,baseHeight:.9,kind:'orb'},
 {id:'detail_atrium_sculpture',x:676,y:688,width:48,height:24,elevation:4.0,baseHeight:.75,kind:'sweep'},
 {id:'detail_atrium_plant_west',x:516,y:834,width:16,height:16,elevation:1.85,baseHeight:0,kind:'plant'},
 {id:'detail_atrium_plant_east',x:866,y:834,width:16,height:16,elevation:1.85,baseHeight:0,kind:'plant'},
 {id:'detail_bench_back_west',x:511,y:854,width:4,height:72,elevation:1.08,baseHeight:0,kind:'benchback'},
 {id:'detail_bench_back_east',x:882,y:854,width:4,height:72,elevation:1.08,baseHeight:0,kind:'benchback'},
] as const;
/** Intentional cover: three exhibits, with opaque sub-volumes shared by every system.
 * Cabinet glass and small display contents never become invisible solid boxes. */
export const COVER_EXHIBITS=[
 {id:'cover_gem',kind:'partition',name:'LIGHT & MINERAL',x:850,y:220,width:16,height:100,elevation:2.8},
 {id:'cover_sculpture',kind:'sculpture',name:'FOLDED STRATA',x:280,y:670,width:50,height:35,elevation:3.4},
 {id:'cover_history',kind:'cabinet',name:'TRAVEL & EXCHANGE',x:1280,y:700,width:55,height:30,elevation:3.0},
] as const;
export function coverWalls():Wall[]{
 return COVER_EXHIBITS.flatMap(e=>{
  const wall=(suffix:string,x:number,y:number,width:number,height:number,elevation:number):Wall=>({id:e.id+suffix,x,y,width,height,elevation,type:'solid'});
  if(e.kind==='partition')return [wall('',e.x,e.y,e.width,e.height,e.elevation)];
  if(e.kind==='sculpture')return [wall('_base',e.x,e.y,e.width,e.height,.32),...[2.8,3.4,3.05].map((h,i)=>wall('_blade_'+i,e.x+3+i*14,e.y+3,14,[22,29,24][i],h))];
  return [wall('_base',e.x,e.y,e.width,e.height,.85),wall('_back',e.x,e.y,e.width,4,e.elevation),wall('_left',e.x,e.y+4,3,e.height-4,e.elevation),wall('_right',e.x+e.width-3,e.y+4,3,e.height-4,e.elevation)];
 });
}
export function defaultWalls():Wall[] {
 const walls:Wall[]=[];
 const add=(id:string,x:number,y:number,width:number,height:number,elevation=5,type?:'solid'|'railing')=>walls.push({id,x,y,width,height,elevation,type});
 add('north',-12,-12,1424,12);add('south_left',-12,1400,632,12);add('entrance_door',620,1400,160,12,3.2);add('south_right',780,1400,632,12);add('west',-12,0,12,1400);add('east',1400,0,12,1400);
 // 140px / 7m doorways, shared by movement, shadows, cameras and navigation.
 for(const [i,a,b] of [[0,0,150],[1,290,630],[2,770,1160],[3,1300,1400]])add('north_partition_'+i,a,454,b-a,12,i===1||i===2?8.2:5);
 for(const x of [454,934])for(const [i,a,b]of [[0,466,670],[1,810,1230],[2,1370,1400]])add('side_partition_'+x+'_'+i,x,a,12,b-a,a<1200?8.2:5);
 // Enclosed holding room: captured players cannot leave; release relocates them outside.
 add('cell_north',474,974,172,12,2.7);add('cell_west',474,986,12,140,2.7);add('cell_east',634,986,12,140,2.7);add('cell_south',474,1120,172,12,2.7);
 add('escape_privacy_partition',740,960,190,12,4.5);
 add('plinth_atrium_privacy',550,810,40,60,3.2);
 add('reception',620,1230,160,40,1.15);add('pedestal_atrium',670,677,60,46,.75);
 add('bench_atrium_west',510,830,28,100,.55);add('bench_atrium_east',860,830,28,100,.55);
 // Gem: perimeter rail enclosure and low display cases. Shadow passes the ropes.
 add('case_gem_a',400,85,100,55,1.55);add('case_gem_b',940,85,120,55,1.55);
 // Recessed perimeter bays keep the central lamp/treasure floor completely open.
 for(const x of [344,1144]){add('gem_bay_wall_'+x+'_north',x,0,12,270,4.8);add('gem_bay_wall_'+x+'_south',x,410,12,44,4.8);}
 add('gem_recess_west',365,155,60,12,2.7);add('gem_recess_east',1075,155,60,12,2.7);
 add('pedestal_sculpture_study',114,154,52,52,.7);
 add('cabinet_history_c',1290,80,70,50,.85);
 add('history_bay_partition',1210,160,12,90,2.7);
 add('pedestal_gem',680,180,40,40,1.2);
 add('rail_gem_west',620,120,10,170,1,'railing');add('rail_gem_north',620,110,180,10,1,'railing');add('rail_gem_east',790,120,10,170,1,'railing');add('rail_gem_south',620,280,180,10,1,'railing');
 // Sculpture: offset solid plinths force an approach from the south.
 add('pedestal_sculpture',180,810,40,40,1.2);add('plinth_sculpture_a',89,732,32,36,1.15);add('plinth_sculpture_b',322,938,36,44,1.15);add('plinth_sculpture_c',84,1002,32,36,.9);
 // History: staggered cabinets and tall partitions, open southern approach.
 add('pedestal_history',1190,830,40,40,1.2);add('cabinet_history_a',980,580,160,45,.85);add('partition_history_a',1180,640,16,120,3.0);add('cabinet_history_b',1260,1000,95,55,.85);add('partition_history_b',1140,970,16,150,3.0);
 // Wood backs/sides stop sightlines; front/top glass remains transparent to CCTV.
 for(const [id,x,y,w,d,h] of [['a',980,580,160,45,2.3],['b',1260,1000,95,55,2.1],['c',1290,80,70,50,2.1]] as const){
  add('cabinet_history_'+id+'_back',x,y,w,4,h);add('cabinet_history_'+id+'_left',x,y+4,4,d-4,h);add('cabinet_history_'+id+'_right',x+w-4,y+4,4,d-4,h);
 }
 walls.push(...coverWalls());
 for(const d of FINISH_DETAILS)add(d.id,d.x,d.y,d.width,d.height,d.elevation);
 return walls;
}
export function movableWalls(props:Movable[]):Wall[] {return props.map(p=>({id:p.id,x:p.x,y:p.y,width:p.width,height:p.height,type:'solid',elevation:2.1}));}

/** Generous example arrangements; reset lamps deliberately start outside all treasure reach. */
export const LAMP_PUZZLES=[
 {id:'lamp_gem',lamp:{x:460,y:200},body:{x:590,y:200},via:[{x:1100,y:350},{x:480,y:350}]},
 {id:'lamp_sculpture',lamp:{x:200,y:1050},body:{x:200,y:880},via:[]},
 {id:'lamp_history',lamp:{x:1050,y:850},body:{x:1160,y:850},via:[{x:1230,y:460},{x:1230,y:530},{x:1200,y:800}]},
] as const;
