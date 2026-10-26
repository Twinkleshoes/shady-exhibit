import {activeTreasures} from './modes.js';
// Client targeting guide uses authoritative shadow endpoint; it never awards interactions.
import type {ClientGameState,PlayerPublic} from '../types/game.js';
import {isShadowTouchingTreasure} from './physics.js';
export function targetFor(state:ClientGameState,p:PlayerPublic) {
 if(p.isCaptured)return null;
 const targets=[...activeTreasures(state.treasures).filter(t=>!t.stolen),...state.switches.filter(sw=>sw.cooldown<=0&&(sw.kind!=='rescue'||state.players.some(p=>p.isCaptured)))];
 return targets.filter(t=>isShadowTouchingTreasure(p.shadow,t as any)).sort((a,b)=>Math.hypot(a.x-p.shadow.handX,a.y-p.shadow.handY)-Math.hypot(b.x-p.shadow.handX,b.y-p.shadow.handY))[0]||null;
}
