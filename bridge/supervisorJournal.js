'use strict';
const fs=require('node:fs');
const path=require('node:path');

// Optional local diagnostic journal. It records only predefined events and names,
// never script text, player details, credentials or stack traces.
// Not an authoritative security audit log.
const TYPES=new Set(['resource-started','resource-stopped','runtime-error',
  'heartbeat-timeout','bridge-unavailable']);
function createSupervisorJournal({file,now=Date.now,
  fsApi=fs,maxBytes=131072}={}) {
  if(file===undefined)return {record:()=>false};
  if(typeof file!=='string'||!path.isAbsolute(file))
    throw new Error('Supervisor journal must be an absolute local path');
  return {
    record(type,resource='bridge') {
      if(!TYPES.has(type)||!/^[A-Za-z0-9_-]{1,64}$/.test(resource))
        return false;
      try {
        const size=fsApi.existsSync(file)?fsApi.statSync(file).size:0;
        if(size>=maxBytes)return false;
        fsApi.appendFileSync(file,JSON.stringify({
          at:new Date(now()).toISOString(),type,resource
        })+'\n',{encoding:'utf8',mode:0o600});
        return true;
      } catch {return false;}
    }
  };
}
module.exports={createSupervisorJournal};
