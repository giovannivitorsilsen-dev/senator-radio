'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {makeDashboard,startDashboard}=require('../lifeadmin/dashboard/server');

async function fixture(t,monitor={status:async port=>({online:true,reason:'HTTP 200',port,latencyMs:4})}) {
  const server=makeDashboard({monitor,targetPort:3099});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return server.address().port;
}
function request(port,pathname='/',method='GET',host) {
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:pathname,method,
      headers:host?{Host:host}:{}},res=>{
      let body='';res.setEncoding('utf8');
      res.on('data',chunk=>{body+=chunk;});
      res.on('end',()=>resolve({code:res.statusCode,headers:res.headers,body}));
    });req.on('error',reject);req.end();
  });
}
test('dashboard serves local HTML and client-side refresh script',async t=>{
  const port=await fixture(t);
  const html=await request(port);
  assert.equal(html.code,200);
  assert.match(html.body,/LifeAdmin/);
  assert.match(html.headers['content-security-policy'],/connect-src 'self'/);
  assert.equal(html.headers['x-frame-options'],'DENY');
  assert.equal(html.headers['cache-control'],'no-store');
  const js=await request(port,'/app.js');
  assert.equal(js.code,200);
  assert.match(js.body,/\/api\/status/);
});
test('dashboard status is a restricted read-only snapshot',async t=>{
  let called=0;
  const port=await fixture(t,{status:async port=>{
    called++;
    return {online:false,reason:'connection refused',port,latencyMs:0};
  }});
  const status=await request(port,'/api/status');
  assert.equal(status.code,401);
  assert.equal(called,0);
  assert.equal((await request(port,'/api/players')).code,404);
  assert.equal((await request(port,'/api/status','POST')).code,405);
});
test('dashboard rejects unexpected Host headers',async t=>{
  const port=await fixture(t);
  const result=await request(port,'/api/status','GET','evil.example');
  assert.equal(result.code,403);
  assert.equal(result.headers['x-frame-options'],'DENY');
});
test('dashboard fails closed if diagnostics fail',async t=>{
  const port=await fixture(t,{status:async()=>{throw Error('sensitive details');}});
  const result=await request(port,'/api/status');
  assert.equal(result.code,401);
  assert.doesNotMatch(result.body,/sensitive details/);
});
test('dashboard binds to loopback and validates ports',async t=>{
  assert.throws(()=>makeDashboard({targetPort:65536}),RangeError);
  assert.throws(()=>startDashboard({LIFE_ADMIN_PORT:'0'}),RangeError);
  assert.throws(()=>startDashboard({LIFE_ADMIN_PORT:'-5'}),RangeError);
});
