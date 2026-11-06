'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createJavaVerifier}=require('../lifeadmin/dashboard/java-verifier');
const token='z'.repeat(43);
const env={LIFE_ADMIN_COMMUNITY_ID:'11111111-1111-4111-8111-111111111111',
  LIFE_JDBC_URL:'jdbc:postgresql://127.0.0.1:5432/test',
  LIFE_JDBC_USER:'localtest',LIFE_JDBC_PASSWORD:'ci-local-only'};

test('Java admin verification defaults to deny without complete DB configuration',async()=>{
 const verify=createJavaVerifier({env:{},classpath:'test'});
 assert.equal(await verify(token),false);
});
test('verified token is sent only over child stdin, not argv',async()=>{
 let command,args,passedEnv,received;
 const spawnProcess=(cmd,argv,opts)=>{
  command=cmd;args=argv;passedEnv=opts.env;
  const child=new EventEmitter();
  child.stdout=new EventEmitter();
  child.stdin=new EventEmitter();
  child.stdin.end=text=>{
    received=text;
    queueMicrotask(()=>{
      child.stdout.emit('data','ALLOW\n');
      child.emit('close',0);
    });
  };
  child.kill=()=>{};
  return child;
 };
 const verify=createJavaVerifier({classpath:'compiled:jdbc/*',env,spawnProcess});
 assert.equal(await verify(token),true);
 assert.equal(command,'java');
 assert.deepEqual(args,['-cp','compiled:jdbc/*','rp.core.AdminSessionVerifier']);
 assert.equal(received,token+'\n');
 assert.equal(args.join(' ').includes(token),false);
 assert.equal(passedEnv.LIFE_JDBC_PASSWORD,env.LIFE_JDBC_PASSWORD);
});
test('Java verifier denies wrong tokens and explicit DENY',async()=>{
 let spawned=0;
 const spawnProcess=()=>{
  spawned++;
  const child=new EventEmitter();
  child.stdout=new EventEmitter();
  child.stdin=new EventEmitter();
  child.stdin.end=()=>{
    queueMicrotask(()=>{child.stdout.emit('data','DENY\n');child.emit('close',0);});
  };
  child.kill=()=>{};
  return child;
 };
 const verify=createJavaVerifier({classpath:'compiled',env,spawnProcess});
 assert.equal(await verify('wrong'),false);
 assert.equal(spawned,0);
 assert.equal(await verify(token),false);
 assert.equal(spawned,1);
});
