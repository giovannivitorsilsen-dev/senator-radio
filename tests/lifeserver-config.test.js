'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os');
const fs=require('node:fs');
const path=require('node:path');
const {loadServerConfig}=require('../config/serverConfig');

test('demo LifeServer config is read from a trusted PC-side JSON file',()=>{
 const config=loadServerConfig();
 assert.equal(config.maxPlayers,50);
 assert.equal(config.visibility,'private');
 assert.match(config.serverName,/PROJECT LIFE RP/);
 assert.equal(Object.isFrozen(config),true);
});
test('free player limit cannot be raised by editing the JSON config',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'life-config-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'server.json');
 const good={schema:1,serverName:'Demo City',maxPlayers:50,mode:'development',
   visibility:'private',motd:'Welcome'};
 fs.writeFileSync(file,JSON.stringify(good));
 assert.equal(loadServerConfig(file).maxPlayers,50);
 for(const maxPlayers of [51,100,200,500,3000]){
   fs.writeFileSync(file,JSON.stringify({...good,maxPlayers}));
   assert.throws(()=>loadServerConfig(file),/Invalid development/);
 }
 fs.writeFileSync(file,JSON.stringify({...good,visibility:'public'}));
 assert.throws(()=>loadServerConfig(file),/Invalid development/);
});
