'use strict';
const crypto=require('node:crypto');

// Integrity check between two trusted local Node processes.
// Never put this key in source control, URLs, browser pages or CLI args.
function validKey(key) {
 return typeof key==='string' && /^[a-f0-9]{64}$/i.test(key);
}
function mac(snapshot,key){
 if(!validKey(key))throw new Error('Telemetry HMAC key must be 64 hex characters');
 return crypto.createHmac('sha256',Buffer.from(key,'hex'))
   .update(JSON.stringify(snapshot),'utf8').digest('hex');
}
function sign(snapshot,key){
 return {...snapshot,signature:mac(snapshot,key)};
}
function verify(snapshot,key){
 if(!validKey(key)||!snapshot||typeof snapshot!=='object'||
   typeof snapshot.signature!=='string'||!/^[a-f0-9]{64}$/.test(snapshot.signature))return false;
 const {signature,...payload}=snapshot;
 const expected=mac(payload,key);
 return crypto.timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex'));
}
module.exports={validKey,sign,verify};
