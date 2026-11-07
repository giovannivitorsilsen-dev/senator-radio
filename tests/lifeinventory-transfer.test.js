'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {catalogFrom,makeInventory,transferBetween}=require('../lifeinventory/inventory');
const defs=()=>catalogFrom([
 {id:'water',weightGrams:500,stackLimit:10},
 {id:'phone',weightGrams:200,stackLimit:1}
]);
function setup(capacity=20000){
 const catalog=defs();
 const from=makeInventory({catalog,slotCount:3,maxWeightGrams:20000});
 const to=makeInventory({catalog,slotCount:2,maxWeightGrams:capacity});
 from.add('water',8);
 return {from,to};
}
test('cross-inventory transfer conserves counts and weight',()=>{
 const {from,to}=setup();
 const result=transferBetween({from,to,sourceSlot:1,quantity:3,
  expectedFromRevision:1,expectedToRevision:0});
 assert.equal(result.from.slots[0].quantity,5);
 assert.equal(result.to.slots[0].quantity,3);
 assert.equal(result.from.weightGrams+result.to.weightGrams,4000);
 assert.equal(result.from.revision,2);
 assert.equal(result.to.revision,1);
});
test('replaying a transfer with stale revisions fails without mutation',()=>{
 const {from,to}=setup();
 const command={from,to,sourceSlot:1,quantity:2,
  expectedFromRevision:1,expectedToRevision:0};
 transferBetween(command);
 const before=[from.snapshot(),to.snapshot()];
 assert.throws(()=>transferBetween(command),/Revision conflict/);
 assert.deepEqual([from.snapshot(),to.snapshot()],before);
});
test('failed capacity checks leave both inventories untouched',()=>{
 const {from,to}=setup(500);
 const before=[from.snapshot(),to.snapshot()];
 assert.throws(()=>transferBetween({from,to,sourceSlot:1,quantity:2,
  expectedFromRevision:1,expectedToRevision:0}),/weight/);
 assert.deepEqual([from.snapshot(),to.snapshot()],before);
});
test('cannot self-transfer, overdraw or use incompatible item definitions',()=>{
 const {from,to}=setup();
 assert.throws(()=>transferBetween({from,to:from,sourceSlot:1,quantity:1,
  expectedFromRevision:1,expectedToRevision:1}),/Distinct/);
 assert.throws(()=>transferBetween({from,to,sourceSlot:1,quantity:9,
  expectedFromRevision:1,expectedToRevision:0}),/Insufficient/);
 const different=makeInventory({catalog:catalogFrom([
  {id:'water',weightGrams:100,stackLimit:10}])});
 assert.throws(()=>transferBetween({from,to:different,sourceSlot:1,quantity:1,
  expectedFromRevision:1,expectedToRevision:0}),/Incompatible/);
});
test('occupied destinations, invalid slots and empty source fail without changes',()=>{
 const {from,to}=setup();
 to.add('phone',1,1);
 const before=[from.snapshot(),to.snapshot()];
 assert.throws(()=>transferBetween({from,to,sourceSlot:1,quantity:1,targetSlot:1,
  expectedFromRevision:1,expectedToRevision:1}),/slots full/);
 assert.throws(()=>transferBetween({from,to,sourceSlot:100,quantity:1,
  expectedFromRevision:1,expectedToRevision:1}),/Invalid source/);
 assert.deepEqual([from.snapshot(),to.snapshot()],before);
});
