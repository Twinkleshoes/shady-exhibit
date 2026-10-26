export const TOUR_MEETING={x:720,y:590,name:'Central Atrium · north of the Confluence sculpture'};
export const TOUR_SPOTS=[530,590,650].flatMap(y=>[560,640,720,800,880].map(x=>({x,y})));
export const TOUR_MIN_TRAVEL=8,TOUR_MAX_TRAVEL=55,TOUR_GATHER_SECONDS=18;
export interface TourPublic {used:boolean;phase:'idle'|'travelling'|'gathering'|'finished';elapsed:number;gatherRemaining:number;}
export const tourActive=(tour:TourPublic)=>tour.phase==='travelling'||tour.phase==='gathering';
