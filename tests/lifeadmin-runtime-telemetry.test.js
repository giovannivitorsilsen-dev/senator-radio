'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {EventEmitter}=require('node:events');
const {createRuntimeStatusReader}=require('../lifeadmin/core/runtime-status');
const {createLuaBridge}=require('../bridge/luaBridge');

function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'life-rp-telemetry-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return path.join(dir,'resources.json');
}
const catalog=()=>[{name:'taxi',status:'not-connected',source:'operator-catalog',dependencies:[]}];

test('C++ stdout resource frame reaches local atomic telemetry, never from client input',t=>{
 const file=fixture(t);
 const child=new EventEmitter();
 child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
 child.stdin.destroyed=false;child.stdin.writableNeedDrain=false;
 const received=[];
 child.stdin.write=x=>{received.push(x);return true;};
 child.stdin.end=()=>{};child.kill=()=>{};
 const bridge=createLuaBridge({enabled:true,binary:'/trusted/bridge',script:'/trusted/taxi.lua',
   statusFile:file,spawn:()=>child});
 assert.equal(fs.existsSync(file),false);
 assert.equal(bridge.hello('RESOURCE welcome STARTED'),true);
 assert.equal(fs.existsSync(file),false);
 child.stdout.emit('data','RESOURCE welcome STA');
 assert.equal(fs.existsSync(file),false);
 child.stdout.emit('data','RTED\n');
 const snap=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(snap.source,'cpp-lua-bridge');
 assert.equal(snap.resources[0].status,'started');
 assert.ok(received[0].startsWith('HELLO '));
 const read=createRuntimeStatusReader({file});
 const result=read.read(catalog());
 assert.equal(result.live,true);
 assert.equal(result.resources.find(r=>r.name==='welcome').status,'started');
 child.emit('exit',1);
 const stopped=read.read(catalog());
 assert.equal(stopped.live,false);
 assert.equal(stopped.resources.some(r=>r.status==='started'),false);
 bridge.close();
});
test('a graceful C++ STOPPED frame is displayed as stopped, not live',t=>{
 const file=fixture(t);
 const child=new EventEmitter();
 child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
 child.stdin.destroyed=false;child.stdin.writableNeedDrain=false;child.stdin.write=()=>true;
 child.stdin.end=()=>{};child.kill=()=>{};
 const bridge=createLuaBridge({enabled:true,binary:'/trusted/bin',script:'/trusted/script',
   statusFile:file,spawn:()=>child});
 child.stdout.emit('data','RESOURCE welcome STARTED\\n');
 child.stdout.emit('data','RESOURCE welcome STOPPED\\n');
 child.emit('exit',0);
 const snap=createRuntimeStatusReader({file}).read(catalog());
 assert.equal(snap.live,false);
 assert.equal(snap.resources.find(r=>r.name==='welcome').status,'stopped');
 bridge.close();
});
test('stale, missing and untrusted telemetry never claims resource started',t=>{
 const file=fixture(t);
 const reader=createRuntimeStatusReader({file,now:()=>20000,maxAgeMs:10000});
 assert.equal(reader.read(catalog()).reason,'unavailable');
 fs.writeFileSync(file,JSON.stringify({schema:1,source:'cpp-lua-bridge',
   observedAt:1,processState:'running',resources:[{name:'welcome',status:'started'}]}));
 assert.equal(reader.read(catalog()).reason,'stale');
 fs.writeFileSync(file,JSON.stringify({schema:1,source:'forged',observedAt:20000,
   processState:'running',resources:[{name:'welcome',status:'started'}]}));
 assert.equal(reader.read(catalog()).reason,'unavailable');
 fs.writeFileSync(file,JSON.stringify({schema:1,source:'cpp-lua-bridge',observedAt:20000,
   processState:'running',resources:[{name:'../bad',status:'started'}]}));
 assert.equal(reader.read(catalog()).live,false);
});
test('telemetry requires an explicit absolute operator-owned file path',()=>{
 assert.throws(()=>createLuaBridge({enabled:true,binary:'bin',script:'script',statusFile:'./resources.json'}));
 const reader=createRuntimeStatusReader({file:undefined});
 assert.equal(reader.read(catalog()).reason,'not-configured');
});
