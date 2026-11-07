# PROJECT LIFE RP — First open-source integration: ENet + original LifeInventory

## What was integrated

**LifeNetwork ENet (MIT library):** The native C++ project now has an opt-in `LIFE_ENABLE_ENET` option, which finds and links the operator-installed ENet development library. The `lifenetwork-enet-smoke` executable calls the real ENet C API, allocates a client host, creates/checks a reliable packet, and releases resources. It does **not** bind a public UDP game server or replace the existing browser-based WebSocket demo. On Linux it is validated through the separate workflow `.github/workflows/enet.yml`.

Official ENet source: https://github.com/lsalzman/enet (MIT). We do not vendor/copy ENet source in this repository. The OS package carries its own upstream license files; preserve them if redistributed.

Build Linux:
```sh
sudo apt-get update
sudo apt-get install -y cmake g++ libenet-dev
cmake -S liveserver-cpp -B liveserver-cpp/build-enet -DLIFE_ENABLE_ENET=ON
cmake --build liveserver-cpp/build-enet
ctest --test-dir liveserver-cpp/build-enet --output-on-failure
```

**LifeInventory (original code):** A self-contained server-side domain module is available in `lifeinventory/inventory.js`. It offers:
- Item catalog with validated IDs, per-item weight in grams and maximum stack sizes.
- Fixed slots and an inventory weight cap.
- Server-controlled `add(itemId,qty,preferredSlot?)`, `move(fromSlot,toSlot,qty)`, `remove(slot,qty)`, `snapshot()`.
- All-or-nothing capacity checks, no replacement of different item types, strict integer quantity validation, clone-safe snapshots, revisions and tests.
- Independent of FiveM, ESX, QBCore, Lua/Unity and any proprietary content.

Run:
```sh
node --test tests/lifeinventory.test.js
npm test
```

Small trusted server-only demonstration:
```js
const {catalogFrom,makeInventory}=require('./lifeinventory/inventory');
const catalog=catalogFrom([{id:'water',weightGrams:500,stackLimit:10}]);
const inv=makeInventory({catalog,slotCount:24,maxWeightGrams:30000});
inv.add('water',2);
console.log(inv.snapshot());
```

ox_inventory reference: https://github.com/overextended/ox_inventory (GPL-3.0). **No GPL source from ox_inventory has been copied into LifeInventory.** We use only generic inventory design ideas, not FiveM-specific Lua natives. Directly importing GPL-3.0 implementations requires further compatibility/licensing work.

## Security and architecture

The inventory has **no player-accessible route, RPC or WebSocket command**. It is not connected to the Node demo or Java identity service yet, because player names in the demo are not authenticated identities. It has no persistence, cross-inventory transaction coordinator, item metadata, item ownership, shops, crafting, or economy. Use it only for trusted server logic and unit tests.

ENet provides UDP transport capabilities, not authentication, encryption, authoritative entity replication, protection from cheating, mobile UI or any GTA/FiveM interoperability. Before exposing a real game socket, implement authenticated sessions, packet validation, rate limits, interest management, snapshots and movement anti-cheat. Android networking is not integrated yet.

Our next milestones are to verify CI, build an authenticated inventory persistence adapter via LifeAccount/Java, introduce inventory transfer transactions and prepare an ENet session handshake for real native PC/Android clients.

## License and provenance summary
| Project | License | Decision |
|---|---|---|
| ENet | MIT | Link upstream system library optionally; no vendoring |
| ox_inventory | GPL-3.0 | Study concepts only; LifeInventory is independently authored |
| FiveM FXServer | Mixed/platform licensing | No FXServer code imported |
| Luau, Minestom, Luanti, Nakama | Varies by component | Future evaluation; not integrated in this milestone |

The Node and C++ code added to PROJECT LIFE RP in this milestone is original, except for dynamically/system-linked ENet.
