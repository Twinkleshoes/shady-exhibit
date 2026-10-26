import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['--import','tsx','server.ts'],{stdio:'inherit'});
let open=false,finished=false;const url='http://127.0.0.1:'+(process.env.PORT||3000);
const poll=setInterval(async()=>{
 if(open||finished)return;
 try{const r=await fetch(url+'/health');if(!r.ok)return;open=true;clearInterval(poll);
  if(process.platform==='win32')spawn('cmd',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
  else console.log('Open '+url+' in your browser.');
 }catch{}
},500);
server.once('exit',(code)=>{finished=true;clearInterval(poll);process.exitCode=code||0;});
server.once('error',e=>{console.error(e);clearInterval(poll);process.exitCode=1;});
process.on('SIGINT',()=>{finished=true;clearInterval(poll);server.kill('SIGINT');});
process.on('SIGTERM',()=>{finished=true;clearInterval(poll);server.kill();});
