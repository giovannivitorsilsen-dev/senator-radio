'use strict';
const fs=require('node:fs');
const path=require('node:path');

const NAME=/^[\p{L}\p{N} _.'—-]{3,64}$/u;
function loadServerConfig(file=path.join(__dirname,'server.json')){
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!data||data.schema!==1||typeof data.serverName!=='string'||
    !NAME.test(data.serverName)||data.maxPlayers!==50||
    data.mode!=='development'||data.visibility!=='private'||
    typeof data.motd!=='string'||data.motd.length>160)
   throw Error('Invalid development LifeServer configuration; paid slot limits are not implemented');
 return Object.freeze({schema:1,serverName:data.serverName,
   maxPlayers:50,mode:'development',visibility:'private',motd:data.motd});
}
module.exports={loadServerConfig};
