'use strict';
const http=require('node:http');
const {MemCache}=require('./mem-cache');
// Local-only probe: no arbitrary URLs, player data or admin commands.
function probeLocalGame({port=3000,timeoutMs=1500,request=http.get}={}) {
  if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('invalid port');
  if(!Number.isInteger(timeoutMs)||timeoutMs<50||timeoutMs>10000)throw new RangeError('invalid timeout');
  const started=process.hrtime.bigint();
  return new Promise(resolve=>{
    let done=false;
    const finish=(online,reason)=>{
      if(done)return;
      done=true;
      resolve({service:'browser-demo',online,reason,port,
        latencyMs:Math.round(Number(process.hrtime.bigint()-started)/1e6)});
    };
    try {
      const req=request({hostname:'127.0.0.1',port,path:'/',method:'GET',timeout:timeoutMs,
        headers:{'Accept':'text/html'}},res=>{
          const code=res.statusCode;
          res.resume();
          finish(code===200,code===200?'HTTP 200':'HTTP '+code);
        });
      req.on('timeout',()=>{req.destroy();finish(false,'timeout');});
      req.on('error',err=>finish(false,err.code||'connection error'));
    } catch {finish(false,'probe error');}
  });
}
function createStatusMonitor({ttlSeconds=2,probe=probeLocalGame}={}) {
  const cache=new MemCache(ttlSeconds);
  return {async status(port=3000){
    const stored=cache.get();
    if(stored && stored.port===port)return stored;
    const result=await probe({port});
    cache.set(result);
    return result;
  }};
}
module.exports={probeLocalGame,createStatusMonitor};
