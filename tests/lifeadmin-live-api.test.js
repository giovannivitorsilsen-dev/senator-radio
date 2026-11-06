'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {makeDashboard}=require('../lifeadmin/dashboard/server');
const TOKEN='A'.repeat(43);

function send(port,route,{method='GET',origin,cookie,body}={}){
 return new Promise((resolve,reject)=>{
  const headers={};
  if(origin)headers.Origin=origin;
  if(cookie)headers.Cookie=cookie;
  if(body)headers['Content-Type']='application/json';
  const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers},res=>{
   let content='';res.on('data',v=>content+=v);res.on('end',()=>resolve({
     code:res.statusCode,content,cookie:res.headers['set-cookie']
   }));
  });
  req.on('error',reject);
  req.end(body?JSON.stringify(body):undefined);
 });
}
test('confirmed C++ resource status is exposed only to verified community staff',async t=>{
 let authorized=true;
 const runtimeReader={read:catalog=>({
  live:true,reason:'confirmed',
  resources:[...catalog,{name:'welcome',status:'started',dependencies:[],source:'cpp-lua-bridge'}]
 })};
 const catalog={list:()=>[{name:'taxi',dependencies:[],status:'not-connected',source:'operator-catalog'}]};
 const server=makeDashboard({verify:async()=>authorized,runtimeReader,catalog});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const port=server.address().port;
 assert.equal((await send(port,'/api/resources')).code,401);
 const origin='http://127.0.0.1:'+port;
 const login=await send(port,'/api/login',{method:'POST',origin,body:{token:TOKEN}});
 assert.equal(login.code,200);
 const cookie=login.cookie[0].split(';')[0];
 const snapshot=await send(port,'/api/resources',{cookie});
 assert.equal(snapshot.code,200);
 const data=JSON.parse(snapshot.content);
 assert.equal(data.live,true);
 assert.equal(data.mode,'runtime-observed');
 assert.equal(data.resources.find(x=>x.name==='welcome').status,'started');
 assert.equal(data.resources.find(x=>x.name==='taxi').status,'not-connected');
 authorized=false;
 assert.equal((await send(port,'/api/resources',{cookie})).code,403);
});
