# LifeRP Core — Java 17+

Implementazione iniziale del dominio: account verificati tramite `Principal` (fornito da un futuro servizio di autenticazione), identità di community, poteri staff e benefici supporter non trasferibili.

## Test locale
```sh
mkdir -p out
javac -d out src/main/java/rp/core/LifeCore.java src/test/java/rp/core/LifeCoreTest.java
java -ea -cp out rp.core.LifeCoreTest
```
Non comprende ancora login, persistenza JDBC, billing, network API, server pubblico né sandbox Lua. `bootstrapOwner` e `issueSupporter` devono essere invocati solo da processi backend fidati. Le mappe sono in memoria: riavviare il processo cancella i dati. Nessun acquisto reale può essere verificato da questo prototipo.

Database target: PostgreSQL e MariaDB/MySQL tramite adapter JDBC e migrazioni dedicate; SQLite per test. XAMPP è facoltativo e HeidiSQL è uno strumento di gestione, non un database.
