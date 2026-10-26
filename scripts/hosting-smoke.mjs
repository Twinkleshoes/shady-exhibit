import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
const base=(process.env.TEST_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clients=[];
async function wait(c,p){const until=Date.now()+15000;while(Date.now()<until){if(c.state&&p(c.state))return c.state;await sleep(30);}throw Error('State timeout: '+c.state?.status);}
async function connect(){const socket=io(base,{transports:['websocket'],forceNew:true,reconnection:false,timeout:15000});const c={socket,state:null};clients.push(c);socket.on('state_update',s=>{c.state=s;if(s.status==='loading')socket.emit('scene_ready',{roundId:s.roundId});if(s.status==='briefing')socket.emit('briefing_ready',{roundId:s.roundId});});await new Promise((r,j)=>{socket.once('connect',r);socket.once('connect_error',j);});assert.equal(socket.io.engine.transport.name,'websocket');return c;}
try{
 const health=await fetch(base+'/health');assert(health.ok);assert.equal((await health.json()).status,'ok');
 const html=await (await fetch(base)).text();
 const urls=[...html.matchAll(/(?:src|href)="([^\"]+\.(?:js|css))"/g)].map(m=>m[1]);assert(urls.some(x=>x.endsWith('.js')));assert(urls.some(x=>x.endsWith('.css')));
 for(const url of [...urls,'/menu-atrium.webp','/menu-atrium-lobby.webp']){const r=await fetch(new URL(url,base));assert(r.ok,url);assert(!r.headers.get('content-type')?.includes('text/html'),url);assert((await r.arrayBuffer()).byteLength>0);}
 console.log('PASS production HTML, hashed JS/CSS and both bundled menu images');
 const rooms=[];
 for(const [mode,count,seconds,charges,treasures] of [['standard',4,360,3,3],['duel',2,240,2,2]]){
  const cs=await Promise.all(Array.from({length:count},connect));const host=cs[0];host.socket.emit('create_room',{playerName:'Hosting host'});await wait(host,s=>s.status==='lobby');if(mode==='duel'){host.socket.emit('set_mode',{mode});await wait(host,s=>s.mode===mode);}
  for(const c of cs.slice(1))c.socket.emit('join_room',{roomCode:host.state.roomCode,playerName:'Hosting guest'});
  await wait(host,s=>s.lobbyPlayers.length===count);host.socket.emit('start_game');await Promise.all(cs.map(c=>wait(c,s=>s.status==='playing')));
  assert.equal(cs.filter(c=>c.state.myRole==='guard').length,1);assert.equal(cs.filter(c=>c.state.myRole==='thief').length,count-1);
  for(const c of cs){assert.equal(c.state.mode,mode);assert(c.state.roundTimeLeft<=seconds&&c.state.roundTimeLeft>seconds-10);assert.equal(c.state.guard.charges,charges);assert.equal(c.state.treasures.filter(t=>t.active!==false).length,treasures);}
  rooms.push(cs);console.log('PASS '+mode+': real WebSockets, private roles, loading/ready/countdown, timer and objectives');
 }
 assert.notEqual(rooms[0][0].state.roomCode,rooms[1][0].state.roomCode);rooms[1][0].socket.disconnect();await wait(rooms[1][1],s=>s.status==='lobby');assert.equal(rooms[0][0].state.status,'playing');console.log('PASS room isolation and Duel disconnect cancellation');
}finally{clients.forEach(c=>c.socket.disconnect());}
