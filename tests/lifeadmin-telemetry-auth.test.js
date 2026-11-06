'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {sign,verify}=require('../bridge/telemetryAuth');
const {createRuntimeStatusReader}=require('../lifeadmin/core/runtime-status');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const secret='c'.repeat(64);
function tmp(t){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'life-hmac-'));
 t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 return path.join(folder,'status.json');
}
test('signed local snapshot is accepted only with matching key',t=>{
 const file=tmp(t);
 const original={schema:1,source:'cpp-lua-bridge',observedAt:Date.now(),
  processState:'running',resources:[{name:'welcome',status:'started',dependencies:[]}]};
 fs.writeFileSync(file,JSON.stringify(sign(original,secret)));
 assert.equal(createRuntimeStatusReader({file,hmacKey:secret}).read([]).live,true);
 assert.equal(createRuntimeStatusReader({file,hmacKey:'d'.repeat(64)}).read([]).live,false);
});
test('modified data, unsigned snapshots and invalid key fail closed',t=>{
 const file=tmp(t);
 const original={schema:1,source:'cpp-lua-bridge',observedAt:Date.now(),
  processState:'running',resources:[{name:'welcome',status:'started',dependencies:[]}]};
 fs.writeFileSync(file,JSON.stringify(original));
 assert.equal(createRuntimeStatusReader({file,hmacKey:secret}).read([]).live,false);
 const forged=sign(original,secret);
 forged.resources[0].name='staff';
 fs.writeFileSync(file,JSON.stringify(forged));
 assert.equal(createRuntimeStatusReader({file,hmacKey:secret}).read([]).live,false);
 assert.throws(()=>createRuntimeStatusReader({file,hmacKey:'bad'}));
});
