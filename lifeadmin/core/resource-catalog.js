'use strict';
const fs=require('node:fs');
const path=require('node:path');

// Operator-maintained catalog, NOT live runtime state.
// Never scans arbitrary user paths or executes manifests/scripts.
function createResourceCatalog({file=path.join(__dirname,'..','resources.json'),
  readFile=fs.readFileSync}={}) {
  return {
    list() {
      const parsed=JSON.parse(readFile(file,'utf8'));
      if(!Array.isArray(parsed)||parsed.length>128)throw Error('Invalid resource catalog');
      return parsed.map(item=>{
        if(!item||typeof item!=='object'||
           typeof item.name!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(item.name)||
           !Array.isArray(item.dependencies)||item.dependencies.length>32||
           !item.dependencies.every(d=>typeof d==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(d)))
          throw Error('Invalid resource metadata');
        return {
          name:item.name,
          dependencies:[...item.dependencies],
          status:'not-connected',
          source:'operator-catalog'
        };
      });
    }
  };
}
module.exports={createResourceCatalog};
