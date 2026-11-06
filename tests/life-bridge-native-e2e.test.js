'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createLuaBridge}=require('../bridge/luaBridge');
const {createRuntimeStatusReader}=require('../lifeadmin/core/runtime-status');

const binary=process.env.LIFE_CPP_BRIDGE_BIN;
const skip=!binary || !fs.existsSync(binary);
const key='b'.repeat(64);

test('real native C++/Lua resource process -> Node -> signed LifeAdmin status', {skip,timeout:15000},async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'life-bridge-e2e-'));
 t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const snapshot=path.join(folder,'status.json');
 const bridge=createLuaBridge({
  enabled:true,binary,
  script:path.resolve('liveserver-cpp/examples/welcome.lua'),
  extraResources:['taxi:welcome='+path.resolve('liveserver-cpp/examples/taxi.lua')],
  statusFile:snapshot,hmacKey:key,pingIntervalMs:300,maxSilentMs:5000
 });
 t.after(()=>bridge.close());
 const reader=createRuntimeStatusReader({file:snapshot,hmacKey:key,maxAgeMs:10000});
 let state;
 const deadline=Date.now()+9000;
 while(Date.now()<deadline){
  state=reader.read([]);
  if(state.live&&state.resources.length>=2)break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.equal(state.live,true,'C++ bridge must announce running resources');
 assert.deepEqual(state.resources.map(r=>r.name).sort(),['taxi','welcome']);
 assert.deepEqual(state.resources.find(r=>r.name==='taxi').dependencies,['welcome']);
 assert.equal(bridge.hello('Mario'),true);
 await new Promise(resolve=>setTimeout(resolve,500));
 state=reader.read([]);
 assert.equal(state.live,true);
 assert.equal(state.supervisor.eventsAccepted>=1,true);
 assert.equal(reader.read([]).reason,'confirmed');
 assert.equal(createRuntimeStatusReader({file:snapshot,hmacKey:'c'.repeat(64)}).read([]).live,false);
});
