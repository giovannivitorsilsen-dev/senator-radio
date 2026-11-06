'use strict';
/**
 * Adapted from txAdmin core/lib/MemCache.ts (MIT).
 * Copyright (c) 2019-2025 Take-Two Interactive Software, Inc.
 * Original: https://github.com/citizenfx/txAdmin/blob/master/core/lib/MemCache.ts
 * License: vendor/txadmin/LICENSE
 * Changes: CommonJS; structuredClone in place of lodash cloneDeep;
 * injectable clock for testing; TTL validation.
 */
class MemCache {
  constructor(ttlSeconds=60, now=Date.now) {
    if(!Number.isFinite(ttlSeconds)||ttlSeconds<=0)throw new RangeError('TTL must be positive');
    this.ttl=ttlSeconds*1000;
    this.now=now;
    this.dataTimestamp=undefined;
    this.data=undefined;
  }
  isValid() {
    if(this.dataTimestamp===undefined)return false;
    if(this.dataTimestamp<this.now()-this.ttl){
      this.dataTimestamp=undefined;
      this.data=undefined;
      return false;
    }
    return true;
  }
  set(data) {
    this.dataTimestamp=this.now();
    this.data=structuredClone(data);
  }
  get() {
    if(this.dataTimestamp===undefined||this.data===undefined)return undefined;
    return this.isValid()?structuredClone(this.data):undefined;
  }
}
module.exports={MemCache};
