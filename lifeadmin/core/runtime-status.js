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
        if(stat(file).size>4096)throw Error('invalid size');
        const snapshot=JSON.parse(readFile(file,'utf8'));
        if(snapshot.schema!==1||snapshot.source!=='cpp-lua-bridge'||
           !['running','stopped','unavailable'].includes(snapshot.processState)||
           !Number.isSafeInteger(snapshot.observedAt)||
           !Array.isArray(snapshot.resources)||snapshot.resources.length>32)
          throw Error('invalid snapshot');
        const age=now()-snapshot.observedAt;
        const fresh=age>=0 && age<=maxAgeMs;
        if(!fresh)return {live:false,reason:'stale',resources:catalog};
        const active=[];
        const names=new Set();
        for(const resource of snapshot.resources) {
          if(!resource||!validName(resource.name)||
             !['started','stopped'].includes(resource.status)||
             names.has(resource.name))throw Error('invalid resource');
          names.add(resource.name);
          active.push({name:resource.name,status:resource.status,
            dependencies:[],source:'cpp-lua-bridge'});
        }
        const live=snapshot.processState==='running';
        const observed=live?active.map(row=>row):[];
        const known=new Set(observed.map(row=>row.name));
        return {
          live,reason:live?'confirmed':'bridge-'+snapshot.processState,
          observedAt:snapshot.observedAt,
          resources:[
            ...catalog.map(row=>{
              const found=observed.find(o=>o.name===row.name);
              return found?{...row,status:found.status,source:'cpp-lua-bridge'}:row;
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
