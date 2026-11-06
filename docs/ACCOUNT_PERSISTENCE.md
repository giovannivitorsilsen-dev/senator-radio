# Persistenza Account / Staff / Supporter (incremento di sviluppo)

## Livello implementato
- `AccountAuth`: PBKDF2-SHA256 con salt, token sessione casuali memorizzati solo come hash SHA-256, scadenza e revoca. `JdbcStore` usa query parametrizzate.
- `CommunityJdbc`: creazione atomica di community con owner; iscrizione membri; autorizzazioni staff limitate alla community e conferibili dall'owner; benefici Supporter personali e non trasferibili; registri audit.
- `DriverManagerDataSource`: connessione JDBC base per test (senza pool).
- Script SQL versionati: `001_core.sql`, `002_auth_sessions.sql`, `003_owner.sql` per PostgreSQL e MariaDB/MySQL.

## Setup database locale
1. Avvia PostgreSQL o MariaDB/MySQL. Per PostgreSQL è disponibile `compose.postgres.yaml` (servizio opt-in).
2. Crea database e utente database dedicato con privilegi minimi.
3. Esegui gli script SQL del motore scelto **nell'ordine 001 → 002 → 003** usando psql, HeidiSQL, DBeaver, pgAdmin o altri client.
4. Inserisci il driver JDBC del database scelto nel classpath del servizio Java (non incluso nelle sorgenti).
5. Configura un DataSource affidabile e utilizza le API Java solo dietro un backend autenticato.

## Limiti importanti
- **NON sono ancora presenti endpoint HTTP pubblici**, quindi non è possibile registrarsi dal browser del prototipo: Java e Node non sono collegati.
- Nessun pagamento Tebex, webhook, UI staff o sandbox Lua collegato.
- Il metodo di provisioning Supporter deve essere invocato solo da un worker backend fidato con pagamento verificato; non è una API da esporre a script/client.
- I database SQL mantengono i record tra riavvii, ma non abbiamo ancora eseguito una prova di migrazione e integrazione reale su PostgreSQL e MariaDB.
- Il modulo non ha ancora test JDBC con database reale; il workflow compila e testa il comportamento Java unitario.
- Il nome utente è un identificativo di login; le community non devono dedurre identità dalla stringa del nome del personaggio.
- Fino a quando non avremo HTTPS, rate limiting, MFA staff, provisioning idempotente e audit operativo, **non ospitare utenti reali o store con pagamenti**.

## Prossima integrazione
Collegare `AccountAuth.authenticate(token)` alla risoluzione di `Principal` nel server dedicato, poi usare `CommunityJdbc.hasStaffPermission` in ogni operazione amministrativa. In seguito integrare inventario/veicoli con `hasActiveSupporterBenefit` per bloccare trasferimenti e accessi non autorizzati.

## Test JDBC reali (aggiunti in questa fase)
La suite `core-java/src/test/java/rp/core/JdbcIntegrationTest.java` carica le migrazioni `001`, `002`, `003` nell'ordine corretto e prova registrazione, autenticazione, sessione salvata, logout, community, autorizzazioni staff isolate, revoca, benefici supporter non trasferibili e audit persistente.

Il workflow GitHub Actions `.github/workflows/ci.yml` usa servizi temporanei PostgreSQL 17 e MariaDB 11.4, Java 17 e i relativi driver JDBC. Le password hard-coded nel workflow sono **solo credenziali temporanee di CI**, non credenziali di produzione.

Per eseguire localmente, creare un database di test vuoto, impostare `LIFE_DB_DIALECT` (`postgresql` o `mariadb`), `LIFE_JDBC_URL`, `LIFE_JDBC_USER`, `LIFE_JDBC_PASSWORD` e lanciare da root del repository:

```sh
mvn -B -f core-java/pom.xml test-compile dependency:copy-dependencies -DoutputDirectory=target/dependency
java -ea -cp "core-java/target/classes:core-java/target/test-classes:core-java/target/dependency/*" rp.core.JdbcIntegrationTest
```

Il percorso classpath mostrato è per Linux; Windows usa `;` al posto di `:`. La suite modifica lo schema del database fornito: **mai eseguirla su un database con dati reali**. L'esito delle esecuzioni CI non è automaticamente garantito dalla pubblicazione del workflow.
