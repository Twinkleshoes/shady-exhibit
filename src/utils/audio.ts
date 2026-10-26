// SPDX-License-Identifier: Apache-2.0
import type {Cue,MusicScene} from './audio-events.js';
export interface AudioPreferences {music:number;effects:number;muted:boolean}
const clamp=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
const notes:Record<Cue,number[]>={click:[700],join:[440,660,880],grab:[220,330],release:[300,180],theft:[660,880,1100],capture:[294,220,147],rescue:[392,523,784],disruption:[180,90,140], 'inspect-start':[440,554], 'inspect-success':[554,740,880], 'inspect-cancel':[370,247],warning:[660,494,660],tour:[659.25,880,783.99],victory:[523,659,784,1047],defeat:[392,330,262,196],step:[120]};
const motifs={menu:[57,64,67,64,60,67,69,67,53,60,65,60,55,62,65,64],museum:[45,0,52,0,48,0,55,0,41,0,48,0,43,0,50,0],escape:[45,57,52,57,48,60,55,60,41,53,48,53,43,55,50,55]};
/** Original procedural score and foley: no external assets, requests or additional render loop. */
export class SoundEffects {
 private ctx:AudioContext|null=null;private master:GainNode|null=null;private music:GainNode|null=null;private effects:GainNode|null=null;
 private prefs:AudioPreferences={music:.35,effects:.65,muted:false};private scene:MusicScene='menu';private unlocked=false;private hidden=false;
 private timer:ReturnType<typeof setInterval>|null=null;private beat=0;private nextBeat=0;private layers=new Map<string,GainNode>();private voices=new Set<AudioScheduledSourceNode>();private effectVoices=new Set<AudioScheduledSourceNode>();private lastCue=new Map<Cue,number>();
 private observer:(()=>void)|null=null;
 constructor(){try{this.prefs={music:clamp(Number(localStorage.getItem('shady_music')??.35)),effects:clamp(Number(localStorage.getItem('shady_effects')??.65)),muted:localStorage.getItem('shady_muted')==='true'};}catch{}}
 public getPreferences(){return {...this.prefs};}
 public subscribe(fn:()=>void){this.observer=fn;return()=>{this.observer=null;};}
 public setVolume(channel:'music'|'effects',value:number){this.prefs[channel]=clamp(value);this.persist();this.apply();}
 public setMuted(muted:boolean){this.prefs.muted=muted;this.persist();this.apply();}
 public getMuted(){return this.prefs.muted;}
 public toggleMute(){this.setMuted(!this.prefs.muted);return this.prefs.muted;}
 private persist(){try{localStorage.setItem('shady_music',String(this.prefs.music));localStorage.setItem('shady_effects',String(this.prefs.effects));localStorage.setItem('shady_muted',String(this.prefs.muted));}catch{}this.observer?.();}
 private ramp(node:GainNode|null,value:number,seconds=.12){if(!node||!this.ctx)return;node.gain.cancelScheduledValues(this.ctx.currentTime);node.gain.setTargetAtTime(value,this.ctx.currentTime,seconds);}
 private apply(){this.ramp(this.master,this.prefs.muted||this.hidden?0:1,.035);this.ramp(this.music,this.prefs.music);this.ramp(this.effects,this.prefs.effects);}
 public async unlock(){
  if(this.ctx){try{if(this.ctx.state==='suspended'&&!this.hidden)await this.ctx.resume();}catch{}return;}
  try{const C=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!C)return;this.ctx=new C();this.master=this.ctx.createGain();this.music=this.ctx.createGain();this.effects=this.ctx.createGain();this.master.gain.value=this.prefs.muted||this.hidden?0:1;this.music.gain.value=this.prefs.music;this.effects.gain.value=this.prefs.effects;this.music.connect(this.master);this.effects.connect(this.master);this.master.connect(this.ctx.destination);for(const name of ['menu','museum','escape','ambience']){const g=this.ctx.createGain();g.gain.value=0;g.connect(this.music);this.layers.set(name,g);}this.unlocked=true;this.nextBeat=this.ctx.currentTime+.03;this.timer=setInterval(()=>this.schedule(),100);await this.ctx.resume();this.setScene(this.scene);}catch{this.dispose();}
 }
 public setScene(scene:MusicScene){this.scene=scene;for(const [name,g] of this.layers)this.ramp(g,name===scene?1:name==='ambience'&&(scene==='museum'||scene==='escape')?.6:0,.45);}
 public setHidden(hidden:boolean){this.hidden=hidden;this.apply();if(hidden){for(const v of this.voices)try{v.stop();}catch{}if(this.ctx)void this.ctx.suspend().catch(()=>{});}else if(this.ctx){this.nextBeat=this.ctx.currentTime+.05;void this.ctx.resume().catch(()=>{});}}
 private tone(frequency:number,at:number,duration:number,volume:number,bus:AudioNode,type:OscillatorType='sine'){
  const ctx=this.ctx;if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(.00001,at);g.gain.linearRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.00001,at+duration);o.connect(g);g.connect(bus);this.voices.add(o);if(bus===this.effects)this.effectVoices.add(o);o.onended=()=>{this.voices.delete(o);this.effectVoices.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.02);
 }
 private noise(at:number,duration:number,volume:number,bus:AudioNode,cutoff:number){const ctx=this.ctx;if(!ctx)return;const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=b;filter.type='lowpass';filter.frequency.value=cutoff;g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.00001,at+duration);s.connect(filter);filter.connect(g);g.connect(bus);this.voices.add(s);if(bus===this.effects)this.effectVoices.add(s);s.onended=()=>{this.voices.delete(s);this.effectVoices.delete(s);s.disconnect();filter.disconnect();g.disconnect();};s.start(at);s.stop(at+duration);}
 private schedule(){if(!this.ctx||this.hidden||!this.unlocked)return;const now=this.ctx.currentTime;if(this.nextBeat<now-.25)this.nextBeat=now+.02;while(this.nextBeat<now+.18){const at=this.nextBeat,i=this.beat++%16;
  // All three low-cost arrangements share a clock; crossfades never restart a second score.
  for(const scene of ['menu','museum','escape'] as const){if(scene!==this.scene&&this.layers.get(scene)!.gain.value<.001)continue;const note=motifs[scene][i],bus=this.layers.get(scene)!;if(note){const f=440*2**((note-69)/12);this.tone(f,at,scene==='museum'?.8:.22,.045,bus,scene==='menu'?'triangle':'sine');if(i%4===0)this.tone(f/2,at,.5,.035,bus,'triangle');}if(scene==='escape'&&i%2===0)this.noise(at,.07,.012,bus,1000);}
  if((this.scene==='museum'||this.scene==='escape')&&i%4===0)this.noise(at,1.4,.009,this.layers.get('ambience')!,550);
  this.nextBeat+=.30;}}
 public play(cue:Cue,volume=1){if(!this.ctx||this.hidden||this.prefs.muted||this.prefs.effects===0)return;const now=this.ctx.currentTime;if(now-(this.lastCue.get(cue)??-10)<(cue==='step'?.09:.08))return;this.lastCue.set(cue,now);const bus=this.effects!;if(cue==='step'){this.noise(now,.075,.07*clamp(volume),bus,850);this.tone(120,now,.065,.018*clamp(volume),bus);return;}
  notes[cue].forEach((f,i)=>this.tone(f,now+i*(cue==='tour'?.18:.09),cue==='click'?.045:.25,.075*clamp(volume),bus,cue==='grab'||cue==='release'?'triangle':'sine'));
  // Momentary music ducking leaves important warnings legible.
  if(!['click','grab','release'].includes(cue)){this.ramp(this.music,this.prefs.music*.4,.025);this.music!.gain.setTargetAtTime(this.prefs.music,now+.6,.25);}}
 public playClick(){this.play('click');}public playAlert(){this.play('warning');}public playTourAnnouncement(){this.play('tour');}public playStealPulse(){this.play('theft',.3);}public playCapture(){this.play('capture');}public playVictory(){this.play('victory');}
 public stopEffects(){for(const v of this.effectVoices)try{v.stop();}catch{}this.effectVoices.clear();this.lastCue.clear();}
 public diagnostics(){return {available:!!this.ctx,unlocked:this.unlocked,scene:this.scene,schedulers:this.timer?1:0,voices:this.voices.size,contextState:this.ctx?.state??'unavailable',preferences:this.getPreferences()};}
 public dispose(){if(this.timer)clearInterval(this.timer);this.timer=null;for(const v of this.voices)try{v.stop();}catch{}this.voices.clear();this.effectVoices.clear();if(this.ctx)void this.ctx.close().catch(()=>{});this.ctx=null;this.layers.clear();this.unlocked=false;this.lastCue.clear();}
}
export const soundManager=new SoundEffects();
