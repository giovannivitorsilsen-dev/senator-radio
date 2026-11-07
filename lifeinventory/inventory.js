'use strict';

// Original PROJECT LIFE RP inventory domain. Not derived from ox_inventory source.
// Trusted server operators instantiate this service; no player-controlled API is exposed.
const NAME=/^[a-z][a-z0-9_]{1,47}$/;
// Private inventory state: unavailable to game WebSocket clients.
const STATES=new WeakMap();
function positiveInt(value,label,max=1000000){
  if(!Number.isSafeInteger(value)||value<1||value>max)throw new RangeError('Invalid '+label);
  return value;
}
function catalogFrom(definitions){
  if(!Array.isArray(definitions)||definitions.length>256)throw Error('Invalid item definitions');
  const items=new Map();
  for(const def of definitions){
    if(!def||typeof def.id!=='string'||!NAME.test(def.id)||items.has(def.id))throw Error('Invalid or duplicate item');
    positiveInt(def.weightGrams,'item weight',100000);
    positiveInt(def.stackLimit,'stack limit',10000);
    items.set(def.id,Object.freeze({id:def.id,weightGrams:def.weightGrams,stackLimit:def.stackLimit}));
  }
  return items;
}
function makeInventory({catalog,slotCount=24,maxWeightGrams=30000}={}){
  if(!(catalog instanceof Map))throw TypeError('Catalog required');
  positiveInt(slotCount,'slots',128);
  positiveInt(maxWeightGrams,'max weight',1000000);
  const definitions=new Map(catalog);
  for(const [id,def] of definitions){
    if(typeof id!=='string'||!NAME.test(id)||!def||def.id!==id)throw Error('Invalid catalog entry');
    positiveInt(def.weightGrams,'item weight',100000);
    positiveInt(def.stackLimit,'stack limit',10000);
    definitions.set(id,Object.freeze({...def}));
  }
  const slots=Array(slotCount).fill(null);
  let revision=0;
  const requireSlot=index=>{
    if(!Number.isSafeInteger(index)||index<1||index>slotCount)throw RangeError('Invalid slot');
    return index-1;
  };
  const weight=()=>slots.reduce((sum,row)=>sum+(row?definitions.get(row.itemId).weightGrams*row.quantity:0),0);
  const snapshot=()=>Object.freeze({
    revision,capacityGrams:maxWeightGrams,weightGrams:weight(),
    slots:slots.map((row,i)=>row?{slot:i+1,...row}:null)
  });
  const add=(itemId,quantity,preferredSlot)=>{
    const def=definitions.get(itemId);
    if(!def)throw Error('Unknown item');
    positiveInt(quantity,'quantity',10000);
    if(weight()+def.weightGrams*quantity>maxWeightGrams)throw Error('Weight limit exceeded');
    const candidate=slots.map(row=>row?{...row}:null);
    let remaining=quantity;
    const positions=preferredSlot===undefined
      ? candidate.map((_,i)=>i)
      : [requireSlot(preferredSlot)];
    // Prefer extending matching stacks, then using free slots.
    for(const phase of [0,1]){
      for(const pos of positions){
        if(remaining===0)break;
        const row=candidate[pos];
        if(phase===0&&(!row||row.itemId!==itemId))continue;
        if(phase===1&&row)continue;
        const space=def.stackLimit-(row?row.quantity:0);
        const count=Math.min(remaining,space);
        if(count<=0)continue;
        candidate[pos]={itemId,quantity:(row?row.quantity:0)+count};
        remaining-=count;
      }
    }
    if(remaining!==0)throw Error('Inventory slots full');
    candidate.forEach((row,i)=>{slots[i]=row;});
    revision++;
    return snapshot();
  };
  const move=(sourceSlot,targetSlot,quantity)=>{
    const from=requireSlot(sourceSlot),to=requireSlot(targetSlot);
    if(from===to)throw Error('Source and target must differ');
    const src=slots[from],dst=slots[to];
    if(!src)throw Error('Empty source slot');
    positiveInt(quantity,'quantity',10000);
    if(quantity>src.quantity)throw Error('Insufficient items');
    const def=definitions.get(src.itemId);
    if(dst&&dst.itemId!==src.itemId)throw Error('Destination occupied by another item');
    if((dst?dst.quantity:0)+quantity>def.stackLimit)throw Error('Stack limit exceeded');
    slots[to]={itemId:src.itemId,quantity:(dst?dst.quantity:0)+quantity};
    slots[from]=src.quantity===quantity?null:{...src,quantity:src.quantity-quantity};
    revision++;
    return snapshot();
  };
  const remove=(slot,quantity)=>{
    const index=requireSlot(slot);
    const src=slots[index];
    if(!src)throw Error('Empty slot');
    positiveInt(quantity,'quantity',10000);
    if(quantity>src.quantity)throw Error('Insufficient items');
    slots[index]=src.quantity===quantity?null:{...src,quantity:src.quantity-quantity};
    revision++;
    return snapshot();
  };
  const inventory=Object.freeze({add,move,remove,snapshot});
  STATES.set(inventory,{slots,definitions,maxWeightGrams,getRevision:()=>revision,commit:next=>{
    next.forEach((row,i)=>{slots[i]=row;});
    revision++;
  }});
  return inventory;
}

/**
 * Synchronous, cross-inventory all-or-nothing move.
 * Call ONLY after a trusted server has verified both inventory owners and permissions.
 * Expected revisions reject stale, repeated requests; durable transactions are NOT implemented.
 */
function transferBetween({from,to,sourceSlot,quantity,expectedFromRevision,
  expectedToRevision,targetSlot}={}){
  if(from===to)throw Error('Distinct inventories required');
  const a=STATES.get(from),b=STATES.get(to);
  if(!a||!b)throw Error('Trusted inventory instances required');
  if(!Number.isSafeInteger(expectedFromRevision)||!Number.isSafeInteger(expectedToRevision)||
     a.getRevision()!==expectedFromRevision||b.getRevision()!==expectedToRevision)
    throw Error('Revision conflict');
  positiveInt(quantity,'quantity',10000);
  if(!Number.isSafeInteger(sourceSlot)||sourceSlot<1||sourceSlot>a.slots.length)
    throw RangeError('Invalid source slot');
  const source=a.slots[sourceSlot-1];
  if(!source||source.quantity<quantity)throw Error('Insufficient items');
  const sourceDef=a.definitions.get(source.itemId);
  const destinationDef=b.definitions.get(source.itemId);
  if(!destinationDef||sourceDef.weightGrams!==destinationDef.weightGrams||
     sourceDef.stackLimit!==destinationDef.stackLimit)
    throw Error('Incompatible item definition');
  const nextA=a.slots.map(row=>row?{...row}:null);
  const nextB=b.slots.map(row=>row?{...row}:null);
  const totalWeight=nextB.reduce((sum,row)=>
    sum+(row?b.definitions.get(row.itemId).weightGrams*row.quantity:0),0);
  if(totalWeight+destinationDef.weightGrams*quantity>b.maxWeightGrams)
    throw Error('Destination weight limit exceeded');
  const positions=targetSlot===undefined?nextB.map((_,i)=>i):
    (Number.isSafeInteger(targetSlot)&&targetSlot>=1&&targetSlot<=nextB.length
      ?[targetSlot-1]:[]);
  if(!positions.length)throw RangeError('Invalid target slot');
  let remaining=quantity;
  for(const phase of [0,1]){
    for(const index of positions){
      const row=nextB[index];
      if((phase===0&&(!row||row.itemId!==source.itemId))||
         (phase===1&&row))continue;
      const available=destinationDef.stackLimit-(row?row.quantity:0);
      if(available<=0)continue;
      const count=Math.min(remaining,available);
      nextB[index]={itemId:source.itemId,quantity:(row?row.quantity:0)+count};
      remaining-=count;
      if(remaining===0)break;
    }
    if(remaining===0)break;
  }
  if(remaining)throw Error('Destination slots full');
  nextA[sourceSlot-1]=source.quantity===quantity?
    null:{...source,quantity:source.quantity-quantity};
  // Both full candidate states are validated before either commit, with no await.
  a.commit(nextA);
  b.commit(nextB);
  return {from:from.snapshot(),to:to.snapshot()};
}
module.exports={catalogFrom,makeInventory,transferBetween};
