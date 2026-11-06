# Account Authentication & JDBC — prototype
The Java 17 module `AccountAuth` supports:
- Username registration with PBKDF2-HMAC-SHA256 salted password hashes (310k iterations).
- Login with 256-bit randomly generated bearer tokens; **only SHA-256 token hashes** are stored.
- Time-limited (12-hour) sessions, expiry and logout.
- Parameterized JDBC queries for PostgreSQL and MariaDB/MySQL.
- Unit tests using an in-memory implementation of the persistence contract.

## Compile and test (JDK 17+)
```sh
mkdir -p core-java/out
javac -d core-java/out core-java/src/main/java/rp/core/{LifeCore,AccountAuth}.java core-java/src/test/java/rp/core/{LifeCoreTest,AccountAuthTest}.java
java -ea -cp core-java/out rp.core.LifeCoreTest
java -ea -cp core-java/out rp.core.AccountAuthTest
```
Run `database/postgresql/002_auth_sessions.sql` or `database/mariadb/002_auth_sessions.sql` **after** the 001_core schema.

## Security / integration blockers
**Not exposed online.** This domain code is not yet connected to the public Node.js demo, has no web routes and has not had a real JDBC integration test. The production service must have TLS, rate limiting, email/username verification where required, MFA for staff, password reset, account lockout, session rotation, schema migration management and audit persistence before publication. Session tokens must never be logged.
Passwords are accepted as mutable char[] and erased after processing; Java Strings and HTTP frameworks may still create immutable copies, which is one reason this code is not yet a production security system. The current `accounts.username` uniqueness depends on the DB collation; production should enforce normalized-case uniqueness.
