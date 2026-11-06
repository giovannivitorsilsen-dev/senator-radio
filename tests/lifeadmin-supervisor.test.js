'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {EventEmitter}=require('node:events');
const {createLuaBridge}=require('../bridge/luaBridge');
const {createRuntimeStatusReader}=require('../lifeadmin/core/runtime-status');

function fakeChild(){
 const child=new EventEmitter();
 child.stdin=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
 child.stdin.destroyed=false;child.stdin.writableNeedDrain=false;
 child.writes=[];child.signals=[];
 child.stdin.write=value=>{child.writes.push(value);return true;};
 child.stdin.end=()=>{};
 child.kill=signal=>{child.signals.push(signal);return true;};
 return child;
}
function temp(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'life-supervisor-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return path.join(dir,'status.json');
}
test('supervisor reports verified child responses, event counters and generic errors',t=>{
 const file=temp(t),child=fakeChild();
 const bridge=createLuaBridge({enabled:true,binary:'local',script:'local.lua',
   statusFile:file,spawn:()=>child});
 child.stdout.emit('data','RESOURCE welcome STARTED\nPONG\nEVENT_OK\nERROR runtime callback\n');
 const info=createRuntimeStatusReader({file}).read([]);
 assert.equal(info.live,true);
 assert.equal(info.error,'runtime callback');
 assert.equal(info.supervisor.eventsAccepted,1);
 assert.equal(info.supervisor.errorCount,1);
 assert.equal(typeof info.supervisor.lastReplyAt,'number');
 assert.equal(info.supervisor.uptimeSeconds>=0,true);
 bridge.close();
});
test('bridge watchdog degrades to unavailable when C++ stops responding',async t=>{
 const file=temp(t),child=fakeChild();
 const bridge=createLuaBridge({enabled:true,binary:'local',script:'local.lua',
   statusFile:file,spawn:()=>child,pingIntervalMs:100,maxSilentMs:1000});
 t.after(()=>bridge.close());
 child.stdout.emit('data','RESOURCE welcome STARTED\n');
 await new Promise(resolve=>setTimeout(resolve,1250));
 const status=createRuntimeStatusReader({file}).read([]);
 assert.equal(status.live,false);
 assert.equal(status.reason,'bridge-unavailable');
 assert.equal(status.supervisor.errorCount,1);
 assert.equal(status.error,'runtime heartbeat timeout');
 assert.ok(child.signals.includes('SIGKILL'));
 assert.ok(child.writes.includes('PING\n'));
});
test('malformed supervisor counters fail closed',t=>{
 const file=temp(t);
 const reader=createRuntimeStatusReader({file});
 fs.writeFileSync(file,JSON.stringify({schema:1,source:'cpp-lua-bridge',
  observedAt:Date.now(),processState:'running',
  resources:[{name:'welcome',status:'started'}],
  supervisor:{uptimeSeconds:5,pingsSent:-1,eventsAccepted:0,errorCount:0,lastReplyAt:Date.now()}}));
 assert.equal(reader.read([]).live,false);
});
test('invalid supervisor settings do not spawn the native process',()=>{
 let called=false;
 assert.throws(()=>createLuaBridge({enabled:true,binary:'local',script:'local.lua',
  maxSilentMs:50,spawn:()=>{called=true;}}));
 assert.equal(called,false);
});
