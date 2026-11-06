'use strict';
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const safeDisplayName=(name)=>{
  if(typeof name!=='string')return null;
  const normalized=name.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,22).trim();
  return normalized || null;
};

// Trusted local child process. Never accepts game-originated console commands.
// A RESOURCE frame is accepted exclusively from C++ stdout, not from players.
function createLuaBridge(options={}) {
  if(options.enabled!==true)return {enabled:false,hello:()=>false,close:()=>{}};
  const binary=options.binary,script=options.script;
  if(typeof binary!=='string'||!binary||typeof script!=='string'||!script)
    throw new Error('Lua bridge requires trusted binary and script paths');

  const statusFile=options.statusFile;
  const extraResources=options.extraResources||[];
  if(!Array.isArray(extraResources)||extraResources.length>15||
     !extraResources.every(v=>typeof v==='string'&&v.length<=512&&
       /^[A-Za-z0-9_-]+(?::[A-Za-z0-9_,-]+)?=.+$/.test(v)))
    throw new Error('Invalid trusted resource specs');
  if(statusFile!==undefined && (typeof statusFile!=='string'||!path.isAbsolute(statusFile)))
    throw new Error('LIFE_RESOURCE_STATUS_FILE must be an absolute local path');
  const child=(options.spawn||spawn)(binary,[script,...extraResources],{
    cwd:options.cwd||path.resolve(__dirname,'..'),
    shell:false,stdio:['pipe','pipe','pipe'],windowsHide:true
  });
  let running=true,buffer='',confirmed=false,gracefulStop=false;
  const known=new Map();
  let lastError=null;
  const publish=(state)=>{
    if(!statusFile)return;
    const result={
      schema:1,source:'cpp-lua-bridge',observedAt:Date.now(),
      processState:state,
      resources:state==='running'||state==='stopped'?[...known.values()]:[],
      error:lastError
    };
    const tmp=statusFile+'.tmp-'+process.pid;
    try {
      fs.writeFileSync(tmp,JSON.stringify(result),{encoding:'utf8',mode:0o600,flag:'w'});
      fs.renameSync(tmp,statusFile);
    } catch {
      // Telemetry is optional. A failed write cannot break game connections.
      try{fs.unlinkSync(tmp);}catch{}
    }
  };
  const consume=(text)=>{
    buffer+=text;
    if(buffer.length>32768){buffer='';return;}
    let pos;
    while((pos=buffer.indexOf('\n'))>=0) {
      const line=buffer.slice(0,pos).trim();
      buffer=buffer.slice(pos+1);
      const match=/^RESOURCE ([A-Za-z0-9_-]{1,64}) (STARTED|STOPPED)(?: ([A-Za-z0-9_,-]{1,1200}))?$/.exec(line);
      if(match) {
        const [,name,state,deps='']=match;
        const dependencies=deps?deps.split(','):[];
        if(dependencies.length<=16&&dependencies.every(v=>/^[A-Za-z0-9_-]{1,64}$/.test(v))){
          known.set(name,{name,status:state==='STARTED'?'started':'stopped',dependencies});
          if(name==='welcome')confirmed=state==='STARTED';
          gracefulStop=[...known.values()].every(r=>r.status==='stopped');
          publish(gracefulStop?'stopped':'running');
        }
      }else if(/^ERROR (runtime startup|runtime callback)$/.test(line)){
        lastError=line.slice(6);
        if(lastError==='runtime startup') {
          confirmed=false;
          publish('unavailable');
        }else{
          publish('running');
        }
      }
      // PONG / EVENT_OK are deliberately not interpreted as resource state.
    }
  };
  if(child.stdout)child.stdout.on('data',part=>consume(String(part)));
  const stopped=()=>{
    if(!running)return;
    running=false;
    clearInterval(timer);
    confirmed=false;
    publish(gracefulStop?'stopped':'unavailable');
  };
  child.on('error',stopped);
  child.on('exit',stopped);
  if(child.stdin)child.stdin.on('error',stopped);
  if(child.stderr)child.stderr.on('data',()=>{});
  const timer=setInterval(()=>{
    if(!running||!child.stdin||child.stdin.destroyed||child.stdin.writableNeedDrain)return;
    try{child.stdin.write('PING\n');}catch{stopped();}
  },3000);
  timer.unref?.();

  return {
    enabled:true,
    hello(displayName) {
      const safe=safeDisplayName(displayName);
      if(!running||!safe||!child.stdin||child.stdin.destroyed||child.stdin.writableNeedDrain)return false;
      try{return child.stdin.write('HELLO '+safe+'\n');}
      catch {stopped();return false;}
    },
    close() {
      stopped();
      if(child.stdin&&!child.stdin.destroyed)child.stdin.end();
      if(typeof child.kill==='function')child.kill('SIGTERM');
    }
  };
}
module.exports={createLuaBridge,safeDisplayName};
