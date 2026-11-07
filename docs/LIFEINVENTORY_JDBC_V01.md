# PROJECT LIFE RP — LifeInventory JDBC + LifeAccount (experimental)

## What was implemented

LifeInventory now has a separate **persistent Java 17 JDBC ledger** in `core-java/src/main/java/rp/core/InventoryJdbc.java`, designed for the existing PostgreSQL/MariaDB schemas. The earlier Node.js slot-based LifeInventory remains a **separate in-memory domain prototype**, not yet connected to this SQL ledger.

New migration `database/{postgresql,mariadb}/004_inventory.sql`:
- `inventory_accounts`: inventory identity and monotonic revision, bound to the composite `(community_id, account_id)` member foreign key.
- `inventory_balances`: item quantities belonging to a community-scoped account inventory, positive quantities and an upper bound.
- `inventory_transfers`: unique UUID operation ID, sender, recipient, item and quantity to prevent duplicate processing of the exact transaction.

The trusted `InventoryJdbc` service supports `provision`, `read`, `grantFromTrustedServer` and `transfer`. Transfers:
1. Check both accounts are members of the specified community.
2. Lock both inventory owner records in stable UUID order using SQL `SELECT ... FOR UPDATE`.
3. Reject stale sender or recipient revision values, missing inventory, insufficient items or quantity cap failures.
4. Insert the operation ID with unique constraint, then update sender and recipient balances and increment both revisions in **one JDBC transaction**.
5. Commit once; on failure, roll back both accounts' modifications.

`InventorySessionService` resolves a real existing LifeAccount session token via `AccountAuth.authenticate`. Its `readOwn` method always reads the current token owner, and `transferOwn` always uses that token owner as the sender. It **does not** provide any client-callable grant or provisioning method.

## Test and migration

The integration suite `core-java/src/test/java/rp/core/JdbcIntegrationTest.java` now applies migration 004 after 001–003 and tests:
- account and community scope separation,
- persistent balances across new service instances,
- transfer revisions and operation ID replay,
- SQL rollback on rejected operations,
- session ownership, invalid token rejection and logout invalidation.

These checks are part of the existing PostgreSQL/MariaDB GitHub Actions matrix. They should be run only against **throwaway test databases**: the test suite creates accounts and communities and must not target production.

Build/integration tests (needs actual test database and environment variables as documented in `docs/ACCOUNT_PERSISTENCE.md`):

```sh
mvn -B -f core-java/pom.xml test-compile dependency:copy-dependencies -DoutputDirectory=target/dependency
java -ea -cp "core-java/target/classes:core-java/target/test-classes:core-java/target/dependency/*" rp.core.JdbcIntegrationTest
```

Use existing `LIFE_DB_DIALECT`, `LIFE_JDBC_URL`, `LIFE_JDBC_USER`, `LIFE_JDBC_PASSWORD` environment variables in a trusted backend environment.

## Scope and security

- The Java ledger stores **quantities per item**, not yet the Node prototype's slot arrangement, stack placement, equipment metadata, capacity/weight, unique serial numbers, or item instances. Do not claim full Node inventory persistence.
- `grantFromTrustedServer` is a privileged method without internal permissions: call it only from backend logic that has already verified the trusted event. Never expose it directly to Lua, ENet, WebSocket, browser or HTTP clients.
- `InventorySessionService` is a **Java service interface**, not an HTTPS gateway or a finished Android/PC login path.
- The SQL database enforces membership and positive amounts; row locks and unique operation IDs protect transfer transactions in the supported database implementations.
- No public inventory command, staff operation, supporter transfer, or remote console capability is exposed.
- Future tasks: integrate authoritative server item definitions and per-account slot/weight limits with this ledger, add authenticated gateway with TLS/rate limits, and keep client gameplay separate from PC-only administrative controls.

## Licenses
All new SQL and Java inventory implementation is original PROJECT LIFE RP work; no GPL ox_inventory source or Rockstar game code has been copied.
