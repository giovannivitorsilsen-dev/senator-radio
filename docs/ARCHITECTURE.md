# PROJECT LIFE RP — Technology & security architecture

## Product invariant
- Android: **gameplay only**. PC Windows: gameplay plus separate **PC-only** administration and map tools.
- A server-side authentication/authorization boundary separates gameplay from administrative services; do not rely on device/user-agent detection.
- Community-scoped roles and supporter rights never transfer to another server automatically.
- Supporter entitlements (vehicle/property/item/outfit/cosmetic) are personal and cannot be sold, gifted, traded, or reassigned by ordinary admin commands or Lua scripts.
- Staff privilege is never granted in exchange for a supporter purchase.

## Language responsibilities
- **C++**: future native client systems, game-world simulation, streaming, netcode and performance-sensitive modules. Proposed future Unity native plugin as appropriate.
- **C**: stable low-level ABI for native interoperability and selected optimized libraries.
- **Lua**: server-side community scripts behind a capability-gated LifeScript API; compatibility adapters for ESX, QBCore and documented vRPex variants. GTA/FiveM natives are NOT implicitly available.
- **Java (17+)**: planned authoritative account, permission, economy, supporter and persistence domain services.
- **Node.js**: existing WebSocket browser demo for tests; not yet migrated, secured or integrated with Java.

## Planned server contracts
1. Auth service issues short-lived verified session tokens; TLS is required. Never accept a self-asserted account ID or staff role from client.
2. Community service resolves authenticated user + selected server to a scoped Principal.
3. Java Core handles staff permissions and supporter entitlements and publishes audited events.
4. SQL persistence uses migrations and parameterized queries; PostgreSQL / MariaDB-MySQL; SQLite only for test and small local worlds. Avoid exposing raw DB connections to scripts.
5. Lua scripts run in a restricted runtime with capabilities and resource limits. ESX/QBCore/vRPex require **tested adapters**, not blanket compatibility.
6. Vehicle, item, housing and trade operations query the entitlement ownership policy before performing transfers.
7. Admin UI and APIs run separately from gameplay, restricted to authorized PC workflows, with MFA, audit and network protection.

## Other tooling
XAMPP is an optional local stack, HeidiSQL and DBeaver are optional desktop clients; phpMyAdmin and pgAdmin may also be used. No mandatory vendor GUI.

## Milestones
A. Validated domain policies (Java/C examples here).
B. Authentication, SQL migrations, audit persistence + integration tests.
C. Replace Node demo trust boundaries with Java service APIs; server-authoritative player actions.
D. Lua runtime + ESX/QBCore/vRPex compatibility matrix; scripted permission enforcement.
E. Vehicle ownership, economy, inventory, staff modes and supporter fulfilment.
F. Map importer CodeWalker YMAP/XML + permitted GLB assets; streaming/collisions; production mobile/PC client.
G. Performance, security, legal review, accessibility, server moderation, deployment.
