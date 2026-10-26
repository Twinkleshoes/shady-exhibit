import React,{useEffect,useState} from 'react';
import {soundManager} from '../utils/audio.js';
export function AudioSettings({muted,onToggleMute}:{muted:boolean;onToggleMute:()=>void}){
 const [prefs,setPrefs]=useState(()=>soundManager.getPreferences());
 useEffect(()=>soundManager.subscribe(()=>setPrefs(soundManager.getPreferences())),[]);
 return <fieldset className="audio-settings"><legend>Audio</legend><label><span>Master mute</span><input type="checkbox" checked={muted} onChange={onToggleMute}/></label>{(['music','effects'] as const).map(channel=><label key={channel}><span>{channel==='music'?'Music':'Effects'} <output>{Math.round(prefs[channel]*100)}%</output></span><input aria-label={`${channel==='music'?'Music':'Effects'} volume`} type="range" min="0" max="100" value={Math.round(prefs[channel]*100)} onChange={e=>soundManager.setVolume(channel,Number(e.target.value)/100)}/></label>)}<small>Music includes museum ambience. Effects include warnings and announcements.</small></fieldset>;
}
