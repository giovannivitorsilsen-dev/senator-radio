'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {createLuaBridge,safeDisplayName}=require('../bridge/luaBridge');

test('bridge disabled by default',()=>{
  const bridge=createLuaBridge();
  assert.equal(bridge.enabled,false);
  assert.equal(bridge.hello('Mario'),false);
});
test('bridge emits only fixed protocol with normalized player names',()=>{
  const lines=[];
  let args,opts;
  const child=new EventEmitter();
  child.stdin=new EventEmitter();
  child.stdin.destroyed=false;
  child.stdin.writableNeedDrain=false;
  child.stdin.write=(text)=>{lines.push(text);return true;};
  child.stdin.end=()=>{};
  child.stderr=new EventEmitter();
  child.kill=()=>true;
  const bridge=createLuaBridge({
    enabled:true,binary:'/trusted/bin',script:'/trusted/welcome.lua',
    spawn:(binary,a,o)=>{args=[binary,...a];opts=o;return child;}
  });
  assert.deepEqual(args,['/trusted/bin','/trusted/welcome.lua']);
  assert.equal(opts.shell,false);
  assert.equal(bridge.hello('Mario'),true);
  assert.equal(bridge.hello('Alice\nrestart core'),true);
  assert.equal(bridge.hello('  '),false);
  assert.equal(bridge.hello(undefined),false);
  assert.deepEqual(lines,['HELLO Mario\n','HELLO Alicerestart core\n']);
  assert.equal(safeDisplayName('X;stop core'),'Xstop core');
  child.emit('exit',1);
  assert.equal(bridge.hello('Mario'),false);
  bridge.close();
});
test('bridge never writes when stream is backpressured',()=>{
  const child=new EventEmitter();
  child.stdin=new EventEmitter();
  child.stdin.destroyed=false;
  child.stdin.writableNeedDrain=true;
  child.stdin.write=()=>{throw Error('must not write');};
  child.stdin.end=()=>{};
  child.stderr=new EventEmitter();
  child.kill=()=>{};
  const bridge=createLuaBridge({enabled:true,binary:'local',script:'file',spawn:()=>child});
  assert.equal(bridge.hello('Mario'),false);
  bridge.close();
});
