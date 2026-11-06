# LifeAdmin v0.2 — dashboard grafica locale (solo lettura)

LifeAdmin è un progetto originale per PROJECT LIFE RP ispirato alle funzioni amministrative di txAdmin. La prima integrazione di codice MIT derivato da txAdmin è la cache `lifeadmin/core/mem-cache.js`. Il relativo copyright/licenza si trova in `vendor/txadmin/LICENSE` e l'audit in `docs/TXADMIN_REUSE_AUDIT.md`.

## Avvio su PC Linux/Windows o terminale Codespaces

Requisiti: Node.js 18+ e dipendenze della demo multiplayer (`npm install`).

Primo terminale, server di gioco:
```sh
npm start
```

Secondo terminale, pannello locale:
```sh
npm run admin
```

Sul **PC che esegue il pannello**, apri `http://127.0.0.1:4101`. Per la sola diagnostica da terminale puoi usare `npm run admin:status`.

Per cambiare le porte (esempio Linux):
```sh
LIFE_ADMIN_PORT=4102 LIFE_ADMIN_TARGET_PORT=3000 npm run admin
```

Questa prima versione mostra:
- stato online/offline ricavato da HTTP 200 della **demo browser Node.js** (non del futuro server C++);
- latenza locale della richiesta HTTP, distinta dal ping dei giocatori;
- porta monitorata e ora dell'ultimo controllo;
- aggiornamento automatico ogni 5 secondi e aggiornamento manuale.

## Sicurezza e limitazioni

La dashboard è un **server HTTP distinto** che fa bind esclusivamente su `127.0.0.1`. Non usa `0.0.0.0`, non gestisce login e non espone comandi; le uniche route sono `/`, `/app.js` e `/api/status`. La route di stato risponde solo a GET e solo a richieste localhost. Non espone statistiche giocatori, chat, proprietà, staff, supporter o segreti.

**Non pubblicare né inoltrare la porta 4101 tramite GitHub Codespaces Ports, reverse proxy, tunnel o port forwarding.** La sola associazione a loopback non è un'autenticazione: tunnel e proxy possono rimuovere questa protezione. Il pannello è destinato a un browser di un operatore PC; l'app Android continuerà a servire soltanto per giocare.

HTTP 200 indica solo che la demo risponde; non conferma la correttezza di autenticazione, backend Java, database, runtime Lua, sincronizzazione o gameplay.

Non sono ancora presenti login staff, sessioni separate, MFA, autorizzazioni community, audit persistente, moderazione, restart remoto, console remota, distribuzione di risorse, o dashboard native Windows/Linux. Prima di aggiungere questi controlli sono necessari un account verificato e permessi server-side.

## Test

```sh
npm test
```

I test in `tests/lifeadmin-dashboard.test.js` coprono endpoint di sola lettura, header di protezione, Host non attesi, validazione porte e gestione errori. La CI è configurata per eseguire i test Node.js ma **non dichiarare riusciti i test GitHub Actions senza verificarne l'esito**.

## Avanzamento previsto

1. Autenticazione staff Java/DB verificata, con MFA, permessi specifici per community e audit.
2. Dashboard risorse C++ e telemetria reale server con adapter autenticato.
3. Console amministrativa, azioni sui giocatori, backup, process supervisor e riavvii programmati, con approvazioni appropriate e limiti.
