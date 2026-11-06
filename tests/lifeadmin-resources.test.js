'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createResourceCatalog}=require('../lifeadmin/core/resource-catalog');
const {makeDashboard}=require('../lifeadmin/dashboard/server');

function catalog(data){
 return createResourceCatalog({file:'fixture',readFile:()=>JSON.stringify(data)});
}
test('resource catalog returns only verified operator fields, never live status',()=>{
 const rows=catalog([{name:'core',dependencies:[],dangerous:'ignored'},
  {name:'taxi',dependencies:['core'],status:'started'}]).list();
 assert.deepEqual(rows,[{name:'core',dependencies:[],status:'not-connected',source:'operator-catalog'},
  {name:'taxi',dependencies:['core'],status:'not-connected',source:'operator-catalog'}]);
});
test('catalog rejects invalid identifiers and oversized lists',()=>{
 assert.throws(()=>catalog([{name:'../invalid',dependencies:[]}]).list());
 assert.throws(()=>catalog([{name:'ok',dependencies:['../../bad']}]).list());
 assert.throws(()=>catalog(Array(129).fill({name:'x',dependencies:[]})).list());
});
function req(port,route,cookie,origin,method='GET',body){
 return new Promise((resolve,reject)=>{
  const headers={};if(cookie)headers.Cookie=cookie;if(origin)headers.Origin=origin;
  if(body)headers['Content-Type']='application/json';
  const request=http.request({hostname:'127.0.0.1',port,path:route,method,headers},response=>{
   let text='';response.on('data',d=>text+=d);response.on('end',()=>resolve({status:response.statusCode,body:text,cookies:response.headers['set-cookie']}));
  });request.on('error',reject);request.end(body?JSON.stringify(body):undefined);
 });
}
test('resources are visible only with a valid and still-authorized local session',async t=>{
 let enabled=true;
 const server=makeDashboard({verify:async()=>enabled,catalog:catalog([{name:'core',dependencies:[]}]),
   monitor:{status:async port=>({port,online:false,reason:'offline',latencyMs:0})}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 const port=server.address().port,origin='http://127.0.0.1:'+port;
 assert.equal((await req(port,'/api/resources')).status,401);
 const login=await req(port,'/api/login',undefined,origin,'POST',{token:'A'.repeat(43)});
 assert.equal(login.status,200);
 const cookie=login.cookies[0].split(';')[0];
 const ok=await req(port,'/api/resources',cookie);
 assert.equal(ok.status,200);
 assert.equal(JSON.parse(ok.body).live,false);
 assert.equal(JSON.parse(ok.body).resources[0].status,'not-connected');
 const state=await req(port,'/api/status',cookie);
 assert.equal(state.status,200);
 assert.equal(typeof JSON.parse(state.body).adminProcess.memoryRssMiB,'number');
 enabled=false;
 assert.equal((await req(port,'/api/resources',cookie)).status,403);
 assert.equal((await req(port,'/api/resources',cookie)).status,401);
 assert.equal((await req(port,'/api/resources',cookie,origin,'POST')).status,405);
});
