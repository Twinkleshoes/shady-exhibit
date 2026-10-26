export type SceneStage='graphics'|'geometry'|'visitors'|'ready'|'error';
export function reportSceneStage(roundId:string,stage:SceneStage){window.dispatchEvent(new CustomEvent('museum-scene-status',{detail:{roundId,stage}}));}
const resources=new Map<string,Set<()=>void>>();
export function registerSceneResource(roundId:string,dispose:()=>void){const set=resources.get(roundId)||new Set();set.add(dispose);resources.set(roundId,set);return()=>{set.delete(dispose);if(!set.size)resources.delete(roundId);};}
export function clearSceneResources(roundId:string){const set=resources.get(roundId);resources.delete(roundId);for(const dispose of set||[])try{dispose();}catch{/* A failed context must not block leaving. */}}
