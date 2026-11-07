# PROJECT LIFE RP — LifeInventory transfers and ENet local packet exchange

## Changes implemented

### LifeInventory trusted in-memory transfers
The original `lifeinventory/inventory.js` now exports `transferBetween({from,to,sourceSlot,quantity,expectedFromRevision,expectedToRevision,targetSlot?})`.

It supports:
- Transfer between **two distinct trusted inventory instances** within one Node.js process.
- Mandatory optimistic revision checks for both inventories to reject stale/repeated transfer instructions.
- Preflight validation of the source stack, destination weight, free slots, stack limits and matching item definitions.
- All-or-nothing updates of both inventories without any asynchronous or intermediate commit.
- A test suite: `tests/lifeinventory-transfer.test.js`.

This is **not a durable database transaction** and is **not permission checking**. If a process crashes, in-memory objects are lost. Do not expose this API to clients. Before integrating with authenticated characters, server-only access policy, account ownership, unique transaction IDs, durable database isolation and auditing must be added.

Example trusted internal transfer:

```js
const {catalogFrom,makeInventory,transferBetween}=require('./lifeinventory/inventory');
const catalog=catalogFrom([{id:'water',weightGrams:500,stackLimit:10}]);
const from=makeInventory({catalog}),to=makeInventory({catalog});
from.add('water',5);
const result=transferBetween({from,to,sourceSlot:1,quantity:2,
  expectedFromRevision:from.snapshot().revision,expectedToRevision:to.snapshot().revision});
console.log(result.from.weightGrams,result.to.weightGrams);
```

### ENet real localhost packet exchange

`liveserver-cpp/lifenetwork_enet_loopback.cpp` now starts **a localhost-only UDP ENet host** on an ephemeral port, creates a client, connects, exchanges reliable request/ack payloads, and cleans up resources. It does not listen on a publicly reachable network interface.

Build and test on Linux (official ENet development package, MIT):
```sh
sudo apt-get update && sudo apt-get install -y libenet-dev cmake g++
cmake -S liveserver-cpp -B liveserver-cpp/build-enet -DLIFE_ENABLE_ENET=ON
cmake --build liveserver-cpp/build-enet
ctest --test-dir liveserver-cpp/build-enet --output-on-failure
```

The existing GitHub workflow `.github/workflows/enet.yml` uses this same CMake and CTest path, so the new loopback test is included automatically.

**ENet by itself provides no encryption or player authentication**. The project still uses WebSocket for its existing browser demo. No mobile client or online native UDP service has been deployed.

## Licenses / sources
- ENet: https://github.com/lsalzman/enet — MIT, installed from the build environment; no source copied.
- ox_inventory: https://github.com/overextended/ox_inventory — GPL-3.0, functionality studied only. LifeInventory implementation is original.

## Remaining gates
1. Run both Node unit tests and ENet CTest and confirm the CI results.
2. Add persistence and an **authorized server-side inventory ownership model** using the LifeAccount Java backend.
3. Add secure native networking handshake, authoritative world state and anti-cheat before any ENet public server is considered.
4. Ensure Android stays gameplay-only; all operator/community management is PC-only.
