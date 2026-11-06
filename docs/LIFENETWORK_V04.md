# LifeNetwork v0.4 — optional browser-to-native Lua event bridge

This is a **prototype integration** between the existing unauthenticated Node WebSocket demo and a trusted C++ Lua resource process.

## Start in Codespaces / Linux
```sh
sudo apt-get update && sudo apt-get install -y cmake g++ liblua5.4-dev
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON
cmake --build liveserver-cpp/build-lua
npm install
LIFE_LUA_BRIDGE=1 LIFE_LUA_BRIDGE_BIN=./liveserver-cpp/build-lua/lifeserver-lua-bridge LIFE_LUA_SCRIPT=./liveserver-cpp/examples/taxi.lua npm start
```
The executable and the script must be local and selected by the trusted operator, not uploaded by or supplied from a game client. Windows operators can supply the equivalent executable path.

## What it actually does
The Node server starts a Lua bridge child process **only** when `LIFE_LUA_BRIDGE=1` and the executable/script are configured. When a connected client sends its first valid `join` name, Node sends a single `HELLO <safe name>` message through the child's private stdin. The C++ bridge converts this to the `rp:hello` event received by the example Lua script.

The bridge rejects all other stdin commands, including `start`, `stop`, `restart`, `ensure`, `exec`, and free-form Lua. It has no HTTP listener or remote administrative interface. Admin abilities are separate and PC-only.

## Security boundaries / limitations
- This event is a **demo display-name event**, not a verified login, payment, staff action or identity claim. Do not treat it as authentication.
- The browser client is unauthenticated. The bridge never gives database, inventory, staff or supporter powers to a Lua script.
- There is no production process isolation: the Lua runtime remains native code. Do not run third-party Lua scripts until secure isolation/capabilities are implemented.
- Bridge process crashing disables Lua event delivery, while the browser multiplayer remains available.
- No FXServer natives, ESX/QBCore/vRPex compatibility, native client synchronization or LifeAdmin dashboard exist yet.
- Run locally or with trusted testers only; for Internet-facing use, TLS/WSS, authentication, rate limiting, DoS protection, and careful deployment review are mandatory.
