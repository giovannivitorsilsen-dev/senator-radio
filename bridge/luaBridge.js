'use strict';
const {spawn}=require('node:child_process');
const path=require('node:path');

const safeDisplayName=(name)=>{
  if(typeof name!=='string')return null;
  const normalized=name.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,22).trim();
  return normalized || null;
};

// The sole protocol emitted here is HELLO <sanitized display name>.
// In particular, client-provided data can NEVER become LifeConsole commands.
function createLuaBridge(options={}) {
  const enabled=options.enabled===true;
  if(!enabled)return {enabled:false,hello:()=>false,close:()=>{}};
  const binary=options.binary;
  const script=options.script;
  if(typeof binary!=='string'||!binary||typeof script!=='string'||!script)
    throw new Error('Lua bridge requires trusted binary and script paths');
  const child=(options.spawn||spawn)(binary,[script],{
    cwd:options.cwd||path.resolve(__dirname,'..'),
    shell:false,
    stdio:['pipe','ignore','pipe'],
    windowsHide:true
  });
  let running=true;
  child.on('error',()=>{running=false;});
  child.on('exit',()=>{running=false;});
  // A failed child or unexpected stderr must never crash the game demo.
  if(child.stdin)child.stdin.on('error',()=>{running=false;});
  if(child.stderr)child.stderr.on('data',()=>{});
  return {
    enabled:true,
    hello(displayName) {
      const safe=safeDisplayName(displayName);
      if(!running||!safe||!child.stdin||child.stdin.destroyed||child.stdin.writableNeedDrain)return false;
      try {
        const ok=child.stdin.write('HELLO '+safe+'\n');
        return ok;
      } catch {
        running=false;
        return false;
      }
    },
    close() {
      running=false;
      if(child.stdin&&!child.stdin.destroyed)child.stdin.end();
      if(typeof child.kill==='function')child.kill('SIGTERM');
    }
  };
}
module.exports={createLuaBridge,safeDisplayName};
