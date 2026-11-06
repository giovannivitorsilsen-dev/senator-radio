'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const {createSupervisorJournal}=require('../bridge/supervisorJournal');
const {createLuaBridge}=require('../bridge/luaBridge');

function fixture(t) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'life-journal-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 return {status:path.join(dir,'status.json'),audit:path.join(dir,'audit.jsonl')};
}
test('journal stores only allowlisted event types and resource names',t=>{
 const {audit}=fixture(t);
 const log=createSupervisorJournal({file:audit,now:()=>1000});
 assert.equal(log.record('resource-started','welcome'),true);
 assert.equal(log.record('read-player-data','player_secret'),false);
 assert.equal(log.record('runtime-error','../../etc'),false);
 const event=JSON.parse(fs.readFileSync(audit,'utf8').trim());
 assert.deepEqual(event,{at:'1970-01-01T00:00:01.000Z',type:'resource-started',resource:'welcome'});
});
test('journal rejects relative paths and respects byte cap',t=>{
 const {audit}=fixture(t);
 assert.throws(()=>createSupervisorJournal({file:'./audit.log'}));
 const log=createSupervisorJournal({file:audit,maxBytes:30});
 assert.equal(log.record('runtime-error'),true);
 assert.equal(log.record('runtime-error'),false);
});
test('Lua bridge writes changes and errors without player messages to journal',t=>{
 const {audit,status}=fixture(t);
 const child=new EventEmitter();
 child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();
 child.stdin.destroyed=false;child.stdin.writableNeedDrain=false;child.stdin.write=()=>true;
 child.stdin.end=()=>{};child.kill=()=>{};
 const bridge=createLuaBridge({enabled:true,binary:'local',script:'local.lua',
   auditFile:audit,statusFile:status,spawn:()=>child});
 bridge.hello('Mario');
 child.stdout.emit('data','RESOURCE welcome STARTED\n');
 child.stdout.emit('data','RESOURCE welcome STARTED\n');
 child.stdout.emit('data','ERROR runtime callback\n');
 child.emit('exit',1);
 const entries=fs.readFileSync(audit,'utf8').trim().split('\n').map(JSON.parse);
 assert.deepEqual(entries.map(row=>row.type),
   ['resource-started','runtime-error','bridge-unavailable']);
 assert.equal(fs.readFileSync(audit,'utf8').includes('Mario'),false);
 bridge.close();
});
