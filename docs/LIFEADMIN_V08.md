# LifeAdmin v0.8 — signed local telemetry and native integration checks

## Implementation

LifeAdmin can verify HMAC-SHA256 signatures on diagnostic snapshots produced by the trusted game process. When `LIFE_TELEMETRY_HMAC_KEY` is set in **both** the game process and the LifeAdmin process, unsigned or modified snapshots are rejected, and the dashboard will show no confirmed live resources. Signing covers the entire canonical JSON payload emitted by the bridge, excluding the `signature` property. Comparison is timing-safe.

This change protects against accidental modification and some out-of-process tampering **where the attacker cannot read the key**. This is **not** yet a separate authenticated IPC channel, and the file itself may be replaced by a process with the same OS identity. It does not authorize staff commands. Strict file ownership, OS separation, TLS/endpoint restrictions and authenticated IPC are still required for production.

## Setup on a trusted Linux PC

After following [LifeAdmin v0.6](LIFEADMIN_V06.md), generate a one-time 32-byte key locally, away from GitHub:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Pass this 64-character hexadecimal secret through the operator's private secret environment to **both** processes as `LIFE_TELEMETRY_HMAC_KEY`. Never put it into `server.js`, committed dotenv files, screenshots, logs, or a client application.

```sh
# These are separate processes; configure LIFE_RESOURCE_STATUS_FILE
# and LIFE_TELEMETRY_HMAC_KEY consistently on both processes.
npm start
npm run admin
```

When the key is not configured, local diagnostic snapshots remain unsigned for backward compatibility with the test/demo. Do not regard that default mode as authenticated telemetry.

## Native end-to-end tests

A new JavaScript test `tests/life-bridge-native-e2e.test.js` starts the actual C++ bridge binary, loads the included `welcome.lua` and `taxi.lua` scripts, checks that the two resource states reach Node.js, verifies HMAC integrity and sends a test player greeting.

The test is activated when `LIFE_CPP_BRIDGE_BIN` points to an existing compiled executable. It is **skipped** otherwise; this distinction must be visible in CI. The Linux Lua workflow now installs Node.js 22 and runs the JavaScript tests after compiling C++/Lua with CMake. Local JavaScript unit tests additionally validate signed data, unsigned data, modified payloads and wrong keys.

```sh
sudo apt-get install -y cmake g++ liblua5.4-dev
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON -DCMAKE_BUILD_TYPE=Debug
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
LIFE_CPP_BRIDGE_BIN="$PWD/liveserver-cpp/build-lua/lifeserver-lua-bridge" npm test
```

## Limits and next objective

- The native bridge and Lua code still execute together in one process. Untrusted community scripts must **not** be run.
- Snapshot signing does not establish the identity of the physical runtime across OS trust boundaries; avoid treating it as an administrative authorization.
- The gameplay demo is not yet Java-authenticated, and the Admin UI is desktop-local, read-only, and depends on LifeAccount ADMIN_VIEW.
- No remote process control, automatic restart, FXServer natives or ESX/QBCore/vRPex compatibility was added.
- Next milestone: dedicated local IPC with OS-level peer identity, process isolation and reproducible green CI.

Do not publish or forward the LifeAdmin port 4101 in Codespaces or via a tunnel. Android remains gameplay-only.
