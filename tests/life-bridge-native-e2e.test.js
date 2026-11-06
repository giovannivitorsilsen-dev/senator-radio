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

test('real native bridge -> Node -> authenticated Unix IPC -> LifeAdmin read model',
 {skip:skip||process.platform==='win32',timeout:15000},async t=>{
 const {createTelemetryIpcServer}=require('../bridge/localTelemetryIpc');
 const {createIpcRuntimeReader}=require('../lifeadmin/core/ipc-runtime-reader');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'life-ipc-native-'));
 t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const socketPath=path.join(folder,'admin.sock');
 const bridge=createLuaBridge({
  enabled:true,binary,
  script:path.resolve('liveserver-cpp/examples/welcome.lua'),
  extraResources:['taxi:welcome='+path.resolve('liveserver-cpp/examples/taxi.lua')],
  pingIntervalMs:300,maxSilentMs:5000
 });
 t.after(()=>bridge.close());
 const ipc=createTelemetryIpcServer({socketPath,key,getSnapshot:()=>bridge.snapshot()});
 await ipc.listen();t.after(()=>ipc.close());
 const reader=createIpcRuntimeReader({socketPath,key});
 let status;
 const deadline=Date.now()+9000;
 while(Date.now()<deadline){
  status=await reader.read([]);
  if(status.live&&status.resources.length===2)break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.equal(status.live,true);
 assert.deepEqual(status.resources.map(r=>r.name).sort(),['taxi','welcome']);
 assert.equal(status.resources.find(r=>r.name==='taxi').status,'started');
 assert.equal(bridge.hello('Mario'),true);
 await new Promise(resolve=>setTimeout(resolve,300));
 status=await reader.read([]);
 assert.equal(status.supervisor.eventsAccepted>=1,true);
});
