import type {GameRoom} from '../types/game.js';
export type ModeId='standard'|'duel';
export interface ModeConfig {id:ModeId;name:string;players:number;guards:number;thieves:number;seconds:number;treasureIds:readonly string[];charges:number;rechargeSeconds:number;teammateRescue:boolean;captureRule:'all-captured'|'two-strikes';capturesToWin:number;detentionSeconds:number;automaticReleases:number}
export const MODES:Readonly<Record<ModeId,Readonly<ModeConfig>>>={
 standard:{id:'standard',name:'Four-Player Heist',players:4,guards:1,thieves:3,seconds:360,treasureIds:['treasure_gem','treasure_sculpture','treasure_history'],charges:3,rechargeSeconds:20,teammateRescue:true,captureRule:'all-captured',capturesToWin:1,detentionSeconds:0,automaticReleases:0},
 duel:{id:'duel',name:'Two-Player Duel',players:2,guards:1,thieves:1,seconds:240,treasureIds:['treasure_gem','treasure_sculpture'],charges:2,rechargeSeconds:20,teammateRescue:false,captureRule:'two-strikes',capturesToWin:2,detentionSeconds:8,automaticReleases:1},
};
export const modeConfig=(mode:ModeId='standard')=>MODES[mode]||MODES.standard;
export const activeTreasures=<T extends {active?:boolean}>(treasures:T[])=>treasures.filter(t=>t.active!==false);
export const modeSummary=(mode:ModeId='standard')=>{const c=modeConfig(mode);return `${c.players} players · ${c.guards} guard / ${c.thieves} ${c.thieves===1?'thief':'thieves'} · ${c.seconds/60} minutes · ${c.treasureIds.length} treasures · ${c.charges} inspection charges. ${c.teammateRescue?'Teammate rescue; all free thieves escape together.':'Sapphire + Bronze Sun; Seal is decorative. First capture: 8-second detention and one new disguise. Second capture ends the round. No teammate rescue.'}`;};
export function changeMode(room:GameRoom,actor:string,mode:unknown){
 if(actor!==room.hostId||room.status!=='lobby'||room.results&&room.resultViewers.some(id=>!room.returnedToLobby.includes(id)))return 'Only the host can change modes in the lobby after all results are dismissed.';
 if(mode!=='standard'&&mode!=='duel')return 'Unknown game mode.';
 if(room.playerOrder.length>MODES[mode].players)return `Too many players for ${MODES[mode].name}. Nobody was removed.`;
 room.mode=mode;room.roundTimeLeft=MODES[mode].seconds;room.guardCharges=MODES[mode].charges;room.captureCounts={};room.pendingReleases={};room.automaticReleaseUsed=[];return null;
}

export function clearModeState(room:GameRoom){room.captureCounts={};room.pendingReleases={};room.automaticReleaseUsed=[];}
