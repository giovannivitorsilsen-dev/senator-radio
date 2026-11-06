#!/usr/bin/env node
'use strict';
const {probeLocalGame}=require('./core/status');
async function main(args=process.argv.slice(2),env=process.env) {
  if(args.length!==1||args[0]!=='status'){
    console.error('Usage: node lifeadmin/cli.js status');
    return 2;
  }
  const raw=env.LIFE_ADMIN_TARGET_PORT||'3000';
  if(!/^\d{1,5}$/.test(raw)){
    console.error('Invalid LIFE_ADMIN_TARGET_PORT');
    return 2;
  }
  const result=await probeLocalGame({port:Number(raw)});
  console.log(`LifeAdmin (LOCAL READ-ONLY): ${result.online?'ONLINE':'OFFLINE'} | ${result.reason} | 127.0.0.1:${result.port} | ${result.latencyMs}ms`);
  return result.online?0:1;
}
if(require.main===module)main().then(code=>{process.exitCode=code;}).catch(()=>{
  console.error('Local probe failed');process.exitCode=2;
});
module.exports={main};
