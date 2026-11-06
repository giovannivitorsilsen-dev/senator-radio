# PROJECT LIFE RP — Codespaces multiplayer test

Versione di prova **autonoma e ridotta** per verificare dal browser Android e PC il collegamento multiplayer. **Non è la Alpha 1.1 completa**: il pacchetto integrale resta disponibile nel file ZIP consegnato in chat e non è ancora stato trasferito in questo repository.

## Avvio
1. GitHub: **Code → Codespaces → Create codespace on main**.
2. Nel terminale esegui `npm start`.
3. Apri **Ports**, seleziona la porta `3000`, copia l'URL HTTPS.
4. Apri il link dal tuo Xiaomi 15T; per provare con un amico, rendi temporaneamente la porta **Public** e condividi il link.
5. Ferma Codespaces quando non giochi, per non consumare la quota.

Il prototipo ha un quartiere 3D semplice, joystick touch, WASD da PC, personaggi condivisi e chat. Nessun accesso amministrativo è pubblicato; non sono implementate autenticazione e anti-cheat di produzione.

La mappa Demo City di Unity **non è inclusa**. Non caricare password, chiavi o asset licenziati in questo repository pubblico.

## Risorse
Per sostituire questa demo con la Alpha 1.1 completa, bisogna caricare i sorgenti dello ZIP `project_life_rp_alpha_11_pc_3d_editor.zip` nel repository. Il file ZIP rimane disponibile nella conversazione.

## LifeAccount / JDBC (prima implementazione)

Sono presenti un servizio account Java 17 e repository SQL parametrizzati per PostgreSQL e MariaDB/MySQL:

- `core-java/src/main/java/rp/core/AccountAuth.java` — registrazione, verifica password, sessioni con token memorizzati soltanto come hash, scadenza e logout.
- `core-java/src/test/java/rp/core/AccountAuthTest.java` — test unitari di autenticazione e revoca.
- `database/{postgresql,mariadb}/002_auth_sessions.sql` — migrazioni di sessione; applicare dopo `001_core.sql`.
- `core-java/AUTHENTICATION.md` — limiti, sicurezza e istruzioni di test.

**Stato:** il servizio Java non è ancora collegato al multiplayer Node.js né esposto come API. La persistenza SQL non è stata ancora collaudata su database reali. La demo continua ad avere accesso anonimo e non è destinata a server pubblici o monetizzati. Le verifiche CI sono configurate ma non ancora confermate.
