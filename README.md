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

## LifeCommunity JDBC — sviluppo del 6 novembre 2026

Il progetto contiene ora la prima persistenza JDBC del nucleo RP (codice **non ancora collegato al server multiplayer Node.js**):
- `core-java/src/main/java/rp/core/AccountAuth.java` — autenticazione e sessioni.
- `core-java/src/main/java/rp/core/CommunityJdbc.java` — comunità, membri, permessi staff e benefici supporter personali.
- `core-java/src/main/java/rp/core/DriverManagerDataSource.java` — collegamento JDBC elementare per test.
- `database/postgresql/` e `database/mariadb/` — migrazioni `001`, `002`, `003`, da applicare in quest'ordine.
- `docs/ACCOUNT_PERSISTENCE.md` — setup e limitazioni.

L'implementazione è **sperimentale**: non esistono ancora endpoint account per il client, gateway autenticato, integrazione pagamenti verificata o test JDBC confermati su database reali. Non usare questo codice come server pubblico a pagamento.
