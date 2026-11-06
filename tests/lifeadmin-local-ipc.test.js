'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const net=require('node:net');
const {createTelemetryIpcServer,fetchTelemetryIpc}=require('../bridge/localTelemetryIpc');
const {createIpcRuntimeReader}=require('../lifeadmin/core/ipc-runtime-reader');
const {sign}=require('../bridge/telemetryAuth');
const KEY='a'.repeat(64),WRONG='b'.repeat(64);
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'life-ipc-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return path.join(dir,'telemetry.sock');
}
test('local IPC authenticates caller and delivers signed resource snapshot', {skip:process.platform==='win32'},async t=>{
 const socketPath=fixture(t);
 let calls=0;
 const ipc=createTelemetryIpcServer({socketPath,key:KEY,getSnapshot:()=>{
   calls++;
   return {schema:1,source:'cpp-lua-bridge',observedAt:Date.now(),processState:'running',
     resources:[{name:'welcome',status:'started',dependencies:[]}]};
 }});
 await ipc.listen();t.after(()=>ipc.close());
 assert.equal(fs.statSync(socketPath).mode&0o777,0o600);
 const reply=await fetchTelemetryIpc({socketPath,key:KEY});
 assert.equal(reply.resources[0].name,'welcome');
 const reader=createIpcRuntimeReader({socketPath,key:KEY});
 const status=await reader.read([]);
 assert.equal(status.live,true);
 assert.equal(status.resources[0].status,'started');
 assert.ok(calls>=2);
 await assert.rejects(fetchTelemetryIpc({socketPath,key:WRONG}),/Invalid IPC response/);
 assert.equal(calls,2,'wrong key must not call getSnapshot');
});
test('IPC denies malformed commands and unsupported arbitrary actions', {skip:process.platform==='win32'},async t=>{
 const socketPath=fixture(t);
 let called=false;
 const ipc=createTelemetryIpcServer({socketPath,key:KEY,getSnapshot:()=>{
   called=true;return {};
 }});
 await ipc.listen();t.after(()=>ipc.close());
 const line=await new Promise((resolve,reject)=>{
  const s=net.createConnection(socketPath);
  s.on('connect',()=>s.write('{"command":"restart","resource":"welcome"}\n'));
  let value='';s.on('data',chunk=>value+=chunk);
  s.on('end',()=>resolve(value));s.on('error',reject);
 });
 assert.equal(line,'DENY\n');
 assert.equal(called,false);
});
test('IPС returns a fail-closed catalog when bridge is absent', {skip:process.platform==='win32'},async t=>{
 const socketPath=fixture(t);
 const reader=createIpcRuntimeReader({socketPath,key:KEY});
 const state=await reader.read([{name:'taxi',dependencies:[]}]);
 assert.equal(state.live,false);
 assert.equal(state.reason,'ipc-unavailable');
 assert.equal(state.resources[0].status,'not-connected');
});
test('IPC cannot be started without a valid key or local socket',()=>{
 assert.throws(()=>createTelemetryIpcServer({socketPath:'/tmp/life.sock',key:'wrong',getSnapshot:()=>({})}));
 assert.throws(()=>createTelemetryIpcServer({socketPath:'127.0.0.1:443',key:KEY,getSnapshot:()=>({})}));
});
