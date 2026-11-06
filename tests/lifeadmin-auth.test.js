'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {makeDashboard}=require('../lifeadmin/dashboard/server');
const TOKEN='A'.repeat(43);

async function fixture(t,verify=async()=>false,now=Date.now){
 const server=makeDashboard({verify,now,targetPort:3020,monitor:{status:async port=>({online:true,port,reason:'HTTP 200',latencyMs:1})}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 return server.address().port;
}
function request(port,route='/',{method='GET',body,cookie,origin,host}={}){
 return new Promise((resolve,reject)=>{
  const headers={};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(cookie)headers.Cookie=cookie;
  if(origin!==undefined)headers.Origin=origin;
  if(host)headers.Host=host;
  const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers},res=>{
   let data='';res.setEncoding('utf8');
   res.on('data',part=>data+=part);
   res.on('end',()=>resolve({code:res.statusCode,body:data,headers:res.headers}));
  });
  req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));
 });
}
test('status is denied before authentication and no Java verifier means fail closed',async t=>{
 const port=await fixture(t);
 assert.equal((await request(port,'/api/status')).code,401);
 const response=await request(port,'/api/login',{method:'POST',body:{token:TOKEN},origin:'http://127.0.0.1:'+port});
 assert.equal(response.code,401);
 assert.equal((await request(port,'/')).code,200);
});
test('valid staff session grants temporary local read-only diagnostics',async t=>{
 const port=await fixture(t,async token=>token===TOKEN);
 const origin='http://127.0.0.1:'+port;
 const login=await request(port,'/api/login',{method:'POST',origin,body:{token:TOKEN}});
 assert.equal(login.code,200);
 const cookie=login.headers['set-cookie'][0].split(';')[0];
 assert.match(login.headers['set-cookie'][0],/HttpOnly; SameSite=Strict/);
 const status=await request(port,'/api/status',{cookie});
 assert.equal(status.code,200);
 assert.equal(JSON.parse(status.body).game.port,3020);
 assert.equal((await request(port,'/api/players',{cookie})).code,404);
 assert.equal((await request(port,'/api/status',{method:'POST',origin,cookie})).code,405);
 assert.equal((await request(port,'/api/logout',{method:'POST',origin,cookie})).code,200);
 assert.equal((await request(port,'/api/status',{cookie})).code,401);
});
test('revocation takes effect at next status call',async t=>{
 let allow=true;
 const port=await fixture(t,async()=>allow);
 const origin='http://127.0.0.1:'+port;
 const login=await request(port,'/api/login',{method:'POST',origin,body:{token:TOKEN}});
 const cookie=login.headers['set-cookie'][0].split(';')[0];
 allow=false;
 assert.equal((await request(port,'/api/status',{cookie})).code,403);
 assert.equal((await request(port,'/api/status',{cookie})).code,401);
});
test('reject CSRF login and unexpected Host',async t=>{
 const port=await fixture(t,async()=>true);
 assert.equal((await request(port,'/api/login',{method:'POST',body:{token:TOKEN}})).code,403);
 assert.equal((await request(port,'/api/login',{method:'POST',origin:'http://evil.example',body:{token:TOKEN}})).code,403);
 assert.equal((await request(port,'/api/status',{host:'evil.example'})).code,403);
});
test('expired dashboard session fails closed',async t=>{
 let now=1000;
 const port=await fixture(t,async()=>true,()=>now);
 const origin='http://127.0.0.1:'+port;
 const login=await request(port,'/api/login',{method:'POST',origin,body:{token:TOKEN}});
 const cookie=login.headers['set-cookie'][0].split(';')[0];
 now+=301000;
 assert.equal((await request(port,'/api/status',{cookie})).code,401);
});
