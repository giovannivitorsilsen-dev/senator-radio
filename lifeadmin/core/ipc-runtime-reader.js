'use strict';
const {fetchTelemetryIpc}=require('../../bridge/localTelemetryIpc');
const {createRuntimeStatusReader}=require('./runtime-status');

// Never read an unsigned or client-supplied snapshot.
// Reuse the existing strict schema, freshness and resource-name validation.
function createIpcRuntimeReader({
 socketPath=process.env.LIFE_TELEMETRY_IPC_PATH,
 key=process.env.LIFE_TELEMETRY_HMAC_KEY,
 fetchSnapshot=fetchTelemetryIpc,now=Date.now
}={}) {
 if(typeof socketPath!=='string'||!socketPath)throw Error('Missing IPC socket path');
 return {
  async read(catalogRows=[]) {
   try {
    const snapshot=await fetchSnapshot({socketPath,key});
    const serialized=JSON.stringify(snapshot);
    return createRuntimeStatusReader({
      file:'/in-memory-trusted-snapshot',hmacKey:key,now,
      stat:()=>({size:Buffer.byteLength(serialized)}),
      readFile:()=>serialized
    }).read(catalogRows);
   } catch {
    return {live:false,reason:'ipc-unavailable',
      resources:catalogRows.map(row=>({...row,status:'not-connected',source:'operator-catalog'}))};
   }
  }
 };
}
module.exports={createIpcRuntimeReader};
