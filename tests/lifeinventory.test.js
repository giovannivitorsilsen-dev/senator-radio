'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {catalogFrom,makeInventory}=require('../lifeinventory/inventory');

const items=()=>catalogFrom([
 {id:'water',weightGrams:500,stackLimit:10},
 {id:'phone',weightGrams:200,stackLimit:1},
 {id:'bread',weightGrams:250,stackLimit:5}
]);
test('LifeInventory computes weight and fills stacks without trusting the client',()=>{
 const inv=makeInventory({catalog:items(),slotCount:3,maxWeightGrams:8000});
 inv.add('water',12);
 const snapshot=inv.snapshot();
 assert.equal(snapshot.weightGrams,6000);
 assert.deepEqual(snapshot.slots.slice(0,2).map(s=>s.quantity),[10,2]);
 assert.equal(snapshot.revision,1);
 const after=inv.move(1,2,3);
 assert.equal(after.slots[0].quantity,7);
 assert.equal(after.slots[1].quantity,5);
 assert.equal(after.weightGrams,6000);
});
test('Weight and full slot failures leave all items unchanged',()=>{
 const inv=makeInventory({catalog:items(),slotCount:2,maxWeightGrams:1250});
 inv.add('water',2);
 const before=inv.snapshot();
 assert.throws(()=>inv.add('water',1),/Weight limit/);
 assert.deepEqual(inv.snapshot(),before);
 const small=makeInventory({catalog:items(),slotCount:1,maxWeightGrams:30000});
 small.add('water',10);
 const original=small.snapshot();
 assert.throws(()=>small.add('bread',1),/slots full/);
 assert.deepEqual(small.snapshot(),original);
});
test('Items may not be duplicated by moving, removing or changing returned snapshots',()=>{
 const inv=makeInventory({catalog:items(),slotCount:3,maxWeightGrams:5000});
 inv.add('phone',1);
 const first=inv.snapshot();
 first.slots[0].quantity=999;
 assert.equal(inv.snapshot().slots[0].quantity,1);
 assert.throws(()=>inv.move(1,2,2),/Insufficient/);
 assert.throws(()=>inv.move(1,1,1),/differ/);
 assert.equal(inv.snapshot().weightGrams,200);
 inv.move(1,2,1);
 assert.equal(inv.snapshot().slots[0],null);
 assert.equal(inv.snapshot().slots[1].quantity,1);
 inv.remove(2,1);
 assert.equal(inv.snapshot().weightGrams,0);
});
test('Cannot mix different item types, overflow stacks or accept invalid IDs',()=>{
 const inv=makeInventory({catalog:items(),slotCount:3,maxWeightGrams:30000});
 inv.add('phone',1,1);inv.add('bread',1,2);
 const initial=inv.snapshot();
 assert.throws(()=>inv.move(1,2,1),/another item/);
 assert.throws(()=>inv.add('phone',1,1),/slots full/);
 assert.throws(()=>inv.add('cheat_money',1),/Unknown item/);
 assert.deepEqual(inv.snapshot(),initial);
 assert.throws(()=>catalogFrom([{id:'BAD NAME',weightGrams:1,stackLimit:1}]));
 assert.throws(()=>catalogFrom([{id:'water',weightGrams:-1,stackLimit:1}]));
});

test('Inventory item definitions are isolated from external catalog mutations',()=>{
 const catalog=items();
 const inv=makeInventory({catalog,slotCount:2,maxWeightGrams:3000});
 catalog.set('water',{id:'water',weightGrams:0,stackLimit:1000000});
 inv.add('water',2);
 assert.equal(inv.snapshot().weightGrams,1000);
 assert.throws(()=>inv.add('water',5),/Weight limit/);
});
test('Catalog requires string IDs and nonzero integer weights',()=>{
 assert.throws(()=>catalogFrom([{id:42,weightGrams:1,stackLimit:1}]));
 assert.throws(()=>catalogFrom([{id:'water',weightGrams:0,stackLimit:1}]));
});
