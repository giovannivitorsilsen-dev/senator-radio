'use strict';

// Original PROJECT LIFE RP inventory domain. Not derived from ox_inventory source.
// Trusted server operators instantiate this service; no player-controlled API is exposed.
const NAME=/^[a-z][a-z0-9_]{1,47}$/;
function positiveInt(value,label,max=1000000){
  if(!Number.isSafeInteger(value)||value<1||value>max)throw new RangeError('Invalid '+label);
  return value;
}
function catalogFrom(definitions){
  if(!Array.isArray(definitions)||definitions.length>256)throw Error('Invalid item definitions');
  const items=new Map();
  for(const def of definitions){
    if(!def||!NAME.test(def.id)||items.has(def.id))throw Error('Invalid or duplicate item');
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
  const slots=Array(slotCount).fill(null);
  let revision=0;
  const requireSlot=index=>{
    if(!Number.isSafeInteger(index)||index<1||index>slotCount)throw RangeError('Invalid slot');
    return index-1;
  };
  const weight=()=>slots.reduce((sum,row)=>sum+(row?catalog.get(row.itemId).weightGrams*row.quantity:0),0);
  const snapshot=()=>Object.freeze({
    revision,capacityGrams:maxWeightGrams,weightGrams:weight(),
    slots:slots.map((row,i)=>row?{slot:i+1,...row}:null)
  });
  const add=(itemId,quantity,preferredSlot)=>{
    const def=catalog.get(itemId);
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
    const def=catalog.get(src.itemId);
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
  return Object.freeze({add,move,remove,snapshot});
}
module.exports={catalogFrom,makeInventory};
