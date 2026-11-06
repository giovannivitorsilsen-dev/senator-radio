'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createLuaBridge}=require('../bridge/luaBridge');
const {createRuntimeStatusReader}=require('../lifeadmin/core/runtime-status');

function child() {
 const process=new EventEmitter();
 process.stdin=new EventEmitter();
 process.stdout=new EventEmitter();
 process.stderr=new EventEmitter();
 process.stdin.destroyed=false;
 process.stdin.writableNeedDrain=false;
 process.stdin.write=()=>true;
 process.stdin.end=()=>{};
 process.kill=()=>{};
 return process;
}
test('two C++ resources preserve individual states and dependencies',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lifeadmin-multi-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'status.json');
 const process=child();
 let argv;
 const bridge=createLuaBridge({enabled:true,binary:'/trusted/bridge',
  script:'/trusted/welcome.lua',extraResources:['jobs:welcome=/trusted/jobs.lua'],
  statusFile:file,spawn:(_bin,args)=>{argv=args;return process;}});
 assert.deepEqual(argv,['/trusted/welcome.lua','jobs:welcome=/trusted/jobs.lua']);
 process.stdout.emit('data','RESOURCE welcome STARTED\n');
 process.stdout.emit('data','RESOURCE jobs STARTED welcome\n');
 let state=createRuntimeStatusReader({file}).read([]);
 assert.equal(state.live,true);
 assert.equal(state.resources.find(r=>r.name==='jobs').status,'started');
 assert.deepEqual(state.resources.find(r=>r.name==='jobs').dependencies,['welcome']);
 process.stdout.emit('data','RESOURCE jobs STOPPED welcome\n');
 state=createRuntimeStatusReader({file}).read([]);
 assert.equal(state.live,true);
 assert.equal(state.resources.find(r=>r.name==='jobs').status,'stopped');
 assert.equal(state.resources.find(r=>r.name==='welcome').status,'started');
 process.stdout.emit('data','ERROR runtime callback\n');
 state=createRuntimeStatusReader({file}).read([]);
 assert.equal(state.error,'runtime callback');
 process.emit('exit',1);
 state=createRuntimeStatusReader({file}).read([]);
 assert.equal(state.live,false);
 assert.equal(state.resources.some(r=>r.status==='started'),false);
 bridge.close();
});
test('multi-resource snapshots reject forged dependencies and invalid errors',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lifeadmin-invalid-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'resources.json');
 const reader=createRuntimeStatusReader({file});
 const snap={schema:1,source:'cpp-lua-bridge',observedAt:Date.now(),
  processState:'running',resources:[{name:'welcome',status:'started',dependencies:['../bad']}]};
 fs.writeFileSync(file,JSON.stringify(snap));
 assert.equal(reader.read([]).live,false);
 snap.resources=[{name:'welcome',status:'started',dependencies:[]}];
 snap.error='raw stack trace / secrets';
 fs.writeFileSync(file,JSON.stringify(snap));
 assert.equal(reader.read([]).live,false);
 snap.error='runtime callback';
 fs.writeFileSync(file,JSON.stringify(snap));
 assert.equal(reader.read([]).error,'runtime callback');
});
test('operator resource specs reject invalid strings and excessive counts',()=>{
 assert.throws(()=>createLuaBridge({enabled:true,binary:'binary',script:'script',
  extraResources:['../../bad=/tmp/script']}));
 assert.throws(()=>createLuaBridge({enabled:true,binary:'binary',script:'script',
  extraResources:Array(16).fill('safe=/trusted/a.lua')}));
});
