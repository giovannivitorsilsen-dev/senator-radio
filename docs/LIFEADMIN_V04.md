# LifeAdmin v0.4 — catalogo risorse e telemetria amministrativa

Questo incremento mantiene la dashboard **PC-only, solo loopback e sola lettura**. Serve una sessione LifeAccount valida con permesso `ADMIN_VIEW` nella community attiva, controllata via Java/JDBC ad ogni richiesta.

## Funzioni nuove

- `GET /api/resources`: restituisce un elenco limitato e validato dei nomi e delle dipendenze configurate in `lifeadmin/resources.json`. La risposta include sempre `live:false` e lo stato `not-connected`: **non è telemetria reale delle risorse LifeServer C++**.
- `GET /api/status`: aggiunge l'uptime e la memoria RSS **del processo Node LifeAdmin**, mai da confondere con CPU, RAM o tick del gioco.
- Java verifier: massimo due verifiche contemporanee, timeout con fail-closed, input del token tramite stdin anziché argv; errori del processo e output non atteso rifiutano l'accesso.
- Test per catalogo, limiti dei nomi, assenza di privilegi e revoca immediata nella dashboard.

## Esecuzione

Segui prima `docs/LIFEADMIN_V03.md` per configurare Java, PostgreSQL/MariaDB, community e token amministrativo.

```sh
npm install
npm start
# secondo terminale sul PC amministrativo
npm run admin
```

Apri `http://127.0.0.1:4101` **solo sul PC ospitante**. Dopo l'accesso il pannello mostra diagnostica HTTP e catalogo delle risorse dichiarate.

Per modificare il catalogo, l'operatore può editare `lifeadmin/resources.json` sul PC e riavviare l'app se necessario. Non è un formato di deploy: attualmente non avvia script, non invia comandi LifeConsole, non conosce lo stato reale dei processi o le risorse Lua avviate.

## Prossimi passaggi per raggiungere txAdmin

1. Inserire nel runtime C++ un endpoint di telemetria locale autenticato, con snapshot reali dei processi e delle risorse.
2. Collegare le metriche reali a LifeAdmin senza esporre console remota pubblica.
3. Completare login staff con MFA, registri audit e gestione delle sessioni prima di aggiungere azioni.
4. Attivare restart, console e moderazione soltanto dopo una separazione solida dei privilegi.

**Non pubblicare la porta LifeAdmin in Codespaces, tunnel o proxy.** La limitazione a loopback non garantisce sicurezza se un proxy rende accessibile il servizio dall'esterno. Il multiplayer Node.js è ancora una demo non autenticata.
