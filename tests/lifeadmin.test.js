'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {MemCache}=require('../lifeadmin/core/mem-cache');
const {probeLocalGame,createStatusMonitor}=require('../lifeadmin/core/status');

test('MIT-derived cache expires and guards against mutations',()=>{
  let now=1000;
  const cache=new MemCache(2,()=>now);
  assert.equal(cache.get(),undefined);
  const input={status:{online:true}};
  cache.set(input);input.status.online=false;
  const result=cache.get();assert.equal(result.status.online,true);
  result.status.online=false;assert.equal(cache.get().status.online,true);
  now=3001;assert.equal(cache.get(),undefined);
  assert.throws(()=>new MemCache(0),RangeError);
});

test('local-only status probe reports HTTP 200',async t=>{
  const server=http.createServer((req,res)=>{
    assert.equal(req.url,'/');res.writeHead(200);res.end('ok');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const port=server.address().port;
  const result=await probeLocalGame({port});
  assert.equal(result.online,true);
  assert.equal(result.reason,'HTTP 200');
  assert.equal(result.port,port);
  assert.ok(result.latencyMs>=0);
});

test('status cache does not expose mutable snapshots',async()=>{
  let calls=0;
  const monitor=createStatusMonitor({ttlSeconds:10,probe:async({port})=>{
    calls++;return {online:true,port,service:'test'};
  }});
  const first=await monitor.status(1234);first.online=false;
  assert.equal((await monitor.status(1234)).online,true);
  assert.equal(calls,1);
  await monitor.status(1235);assert.equal(calls,2);
});

test('invalid ports are rejected without a network request',()=>{
  assert.throws(()=>probeLocalGame({port:0}),RangeError);
  assert.throws(()=>probeLocalGame({port:65536}),RangeError);
});
