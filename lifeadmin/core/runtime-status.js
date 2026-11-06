'use strict';
const fs=require('node:fs');
const path=require('node:path');

const validName=name=>typeof name==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(name);
function createRuntimeStatusReader({file=process.env.LIFE_RESOURCE_STATUS_FILE,
  now=Date.now,readFile=fs.readFileSync,stat=fs.statSync,maxAgeMs=10000}={}) {
  const configured=typeof file==='string'&&path.isAbsolute(file);
  return {
    read(catalogRows=[]) {
      const catalog=catalogRows.map(row=>({
        ...row,status:'not-connected',source:'operator-catalog'
      }));
      if(!configured)return {live:false,reason:'not-configured',resources:catalog};
      try {
        if(stat(file).size>32768)throw Error('invalid size');
        const snapshot=JSON.parse(readFile(file,'utf8'));
        if(snapshot.schema!==1||snapshot.source!=='cpp-lua-bridge'||
           !['running','stopped','unavailable'].includes(snapshot.processState)||
           !Number.isSafeInteger(snapshot.observedAt)||
           !Array.isArray(snapshot.resources)||snapshot.resources.length>32)
          throw Error('invalid snapshot');
        const age=now()-snapshot.observedAt;
        const fresh=age>=0 && age<=maxAgeMs;
        if(!fresh)return {live:false,reason:'stale',resources:catalog};
        if(snapshot.error!==undefined && snapshot.error!==null &&
           !['runtime startup','runtime callback','runtime heartbeat timeout'].includes(snapshot.error))throw Error('invalid error');
        const supervisor=snapshot.supervisor;
        if(supervisor!==undefined && supervisor!==null &&
          (!Number.isSafeInteger(supervisor.uptimeSeconds)||supervisor.uptimeSeconds<0||
           !Number.isSafeInteger(supervisor.pingsSent)||supervisor.pingsSent<0||
           !Number.isSafeInteger(supervisor.eventsAccepted)||supervisor.eventsAccepted<0||
           !Number.isSafeInteger(supervisor.errorCount)||supervisor.errorCount<0||
           (supervisor.lastReplyAt!==null &&
             (!Number.isSafeInteger(supervisor.lastReplyAt)||supervisor.lastReplyAt>now()))))
          throw Error('invalid supervisor data');
        const active=[];
        const names=new Set();
        for(const resource of snapshot.resources) {
          if(!resource||!validName(resource.name)||
             !['started','stopped'].includes(resource.status)||
             names.has(resource.name)||
             (resource.dependencies!==undefined &&
              (!Array.isArray(resource.dependencies)||resource.dependencies.length>16||
               !resource.dependencies.every(validName))))
            throw Error('invalid resource');
          names.add(resource.name);
          active.push({name:resource.name,status:resource.status,
            dependencies:resource.dependencies||[],source:'cpp-lua-bridge'});
        }
        const live=snapshot.processState==='running';
        const observed=(live||snapshot.processState==='stopped')?active:[];
        return {
          live,reason:live?'confirmed':'bridge-'+snapshot.processState,
          error:snapshot.error||null,
          supervisor:supervisor?{
            uptimeSeconds:supervisor.uptimeSeconds,
            pingsSent:supervisor.pingsSent,
            eventsAccepted:supervisor.eventsAccepted,
            errorCount:supervisor.errorCount,
            lastReplyAt:supervisor.lastReplyAt
          }:null,
          observedAt:snapshot.observedAt,
          resources:[
            ...catalog.map(row=>{
              const found=observed.find(o=>o.name===row.name);
              return found?{...row,status:found.status,dependencies:found.dependencies,source:'cpp-lua-bridge'}:row;
            }),
            ...observed.filter(row=>!catalog.some(c=>c.name===row.name))
          ]
        };
      } catch {
        return {live:false,reason:'unavailable',resources:catalog};
      }
    }
  };
}
module.exports={createRuntimeStatusReader};
