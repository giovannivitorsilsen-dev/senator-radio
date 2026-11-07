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

## LifeServer v0.3 — console Lua integrata (sperimentale)

Nella cartella [`liveserver-cpp`](liveserver-cpp/) è disponibile un primo collegamento funzionante a livello di codice fra gestione risorse, Lua 5.4 ed eventi C++. La console nativa `lifeserver-lua-console` può avviare un file Lua locale scelto dall'operatore, emettere eventi, leggere i log e fermare/riavviare risorse; i test sono in `integrated_test.cpp`.

Istruzioni dettagliate e limiti: [`docs/LIFERUNTIME_INTEGRATION.md`](docs/LIFERUNTIME_INTEGRATION.md). **Non è ancora collegata al multiplayer Node.js o alla persistenza Java**; non esiste pannello LifeAdmin remoto e non è una sandbox affidabile per script di terzi. Le build e i test automatici devono ancora essere confermati in GitHub Actions.

## LifePermissions v0.5 — capacità Lua per risorsa

Il server C++ registra un elenco esplicito di capacità per ciascuna risorsa Lua. Le nuove API sono `HasCapability(capability)` e `RequestAction(capability, payload)`. **Solo `chat.notice` ha un'implementazione dimostrativa**, che scrive nel log locale della risorsa dopo la verifica del permesso. Nessuna API per staff, denaro, veicoli o Supporter è esposta dagli script in questa versione.

Sono stati aggiunti controlli sulle capacità sconosciute, sui wildcard, sulle risorse prive di concessioni e sulla separazione tra risorse. Test C++ base e test Lua aggiornati. Leggi [`docs/LIFEPERMISSIONS_V05.md`](docs/LIFEPERMISSIONS_V05.md) per limiti e istruzioni. Le build/CI non sono ancora confermate.

## LifeAdmin v0.1 — riuso selettivo txAdmin MIT

Abbiamo avviato la componente gestionale PC-only: la cache di txAdmin `core/lib/MemCache.ts` è stata adattata (MIT, attribuzione in `vendor/txadmin/LICENSE`) e utilizzata in un **monitor di sola lettura** per la demo server locale.

```sh
npm start
# in un secondo terminale:
node lifeadmin/cli.js status
npm test
```

Il monitor controlla esclusivamente `127.0.0.1:3000` (porta configurabile tramite `LIFE_ADMIN_TARGET_PORT`) e non esegue comandi amministrativi né espone una dashboard web. È un primo componente tecnico, **non** il txAdmin completo.

Modulo e test: `lifeadmin/` e `tests/lifeadmin.test.js`; audit licenze, moduli da riutilizzare e limiti: [docs/TXADMIN_REUSE_AUDIT.md](docs/TXADMIN_REUSE_AUDIT.md).

## LifeAdmin v0.2 — dashboard grafica locale

È disponibile una prima dashboard di sola lettura **separata dalla porta del gioco**:

```sh
npm start
# In un secondo terminale PC:
npm run admin
```

Apri **http://127.0.0.1:4101** sul PC che esegue LifeAdmin. Mostra la risposta HTTP della demo, la latenza locale e l'ultimo controllo, con aggiornamento automatico. Per un controllo da console: `npm run admin:status`.

**Non inoltrare o rendere pubblica la porta 4101 su Codespaces.** La dashboard non ha ancora autenticazione né controlli amministrativi: sono ammesse solo letture su loopback. I dati non rappresentano lo stato del runtime C++/Lua o del database Java.

Dettagli e limitazioni: [docs/LIFEADMIN_V02.md](docs/LIFEADMIN_V02.md).

## LifeAdmin v0.3 — sessioni Java e permesso ADMIN_VIEW

La dashboard locale è ora **protetta da un verificatore Java obbligatorio**. Non è possibile leggere `/api/status` senza una sessione LifeAccount valida e il permesso `ADMIN_VIEW` per la community configurata. Le autorizzazioni vengono ricontrollate per ogni richiesta di diagnostica, e la sessione della dashboard dura al massimo 5 minuti. Senza configurazione Java/JDBC l'accesso è negato.

La password dell'account non viene inserita nella dashboard. Esiste una CLI Java per creare un token di sessione da un **account già registrato**, solo tramite un terminale interattivo fidato. Non sono ancora disponibili MFA, login web con password, gestioni staff remote, restart server, o controlli amministrativi del gioco.

Vedi [docs/LIFEADMIN_V03.md](docs/LIFEADMIN_V03.md) per preparare JDBC, avviare `npm run admin`, ottenere il token locale e comprendere i limiti. **Non pubblicare la porta 4101 o usarla tramite tunnel Codespaces.**

## LifeAdmin v0.4 — risorse dichiarate e stato del processo

La dashboard autenticata ora mostra le risorse **dichiarate** in `lifeadmin/resources.json` (nomi e dipendenze) e uptime/RAM **del processo amministrativo**, senza fingere di conoscere lo stato reale delle VM Lua. La nuova route `/api/resources` richiede la stessa sessione Java e il permesso community `ADMIN_VIEW` della diagnostica.

Il verificatore Java ha limiti di concorrenza e timeout. Prima di usare il pannello serve configurare Java/JDBC e un account staff autorizzato. Nessuna porta amministrativa deve essere resa pubblica. Dettagli: [docs/LIFEADMIN_V04.md](docs/LIFEADMIN_V04.md).

## LifeAdmin v0.5 — telemetria C++ Lua confermata

Il bridge C++/Lua della demo produce ora un messaggio di stato `RESOURCE welcome STARTED/STOPPED` e risponde ai controlli `PING` via stdin. Il server Node può trasferire queste conferme a un file diagnostico locale con `LIFE_RESOURCE_STATUS_FILE`, letto dalla dashboard **soltanto dopo la verifica LifeAccount Java + permesso ADMIN_VIEW**.

L'interfaccia distingue le conferme recenti da file scaduti (oltre 10 s), mancanti o non validi; non presenta come avviate le risorse presenti soltanto nel catalogo. È osservata **solo la risorsa `welcome` del bridge sperimentale**, non l'intero motore FXServer-like. Nessun comando remoto di avvio/arresto è stato aggiunto.

Compilazione, configurazione e limiti: [docs/LIFEADMIN_V05.md](docs/LIFEADMIN_V05.md). Non esporre la porta amministrativa 4101; il pannello rimane PC-only.

## LifeAdmin v0.6 — telemetria di più risorse Lua

Il bridge locale C++/Lua ora accetta fino a 15 risorse aggiuntive dichiarate dall'operatore tramite `LIFE_LUA_EXTRA_RESOURCES`, con dipendenze e stati separati. La dashboard LifeAdmin, dietro LifeAccount e permesso community `ADMIN_VIEW`, interpreta conferme recenti di avvio/arresto e categorie generiche di errore; gli script di terzi e i comandi remoti restano disabilitati.

Il protocollo è ancora **sperimentale e circoscritto al bridge della demo**, non all'intero server RP multi-community. Vedi [docs/LIFEADMIN_V06.md](docs/LIFEADMIN_V06.md) per configurazione e limiti. Le nuove verifiche C++ e Node sono da confermare in GitHub Actions.

## LifeAdmin v0.7 — supervisore Lua locale

Il bridge C++/Lua della demo è monitorato da un watchdog: senza risposta verificata entro 10 secondi lo stato passa a non disponibile e il processo bloccato viene terminato, senza riavvio automatico. La dashboard amministrativa autenticata mostra uptime, PING inviati, eventi confermati ed errori generici del bridge, non dell'intero server di gioco.

È inoltre disponibile un journal locale JSONL **opzionale**, limitato alle categorie d'evento non sensibili, configurato via `LIFE_SUPERVISOR_AUDIT_FILE`. Nessuna operazione staff o restart è abilitata via browser. I test sono in `tests/lifeadmin-supervisor*.test.js`; dettagli in [docs/LIFEADMIN_V07.md](docs/LIFEADMIN_V07.md).

## LifeAdmin v0.8 — signed local telemetry and integration checks

The game bridge now optionally signs local resource snapshots with HMAC-SHA256 using `LIFE_TELEMETRY_HMAC_KEY`, and LifeAdmin verifies the signature before accepting live resource status. With a configured key, unsigned or tampered snapshots are rejected. This integrity protection is **not yet an authenticated IPC socket or production process isolation**. Keep the key private on the PC host, never in the Android game client.

A new end-to-end test starts the actual C++ Lua bridge (when compiled) and verifies `welcome` and `taxi` resource telemetry through the Node layer. The Linux Lua CI workflow has been updated to run that check. Details: [docs/LIFEADMIN_V08.md](docs/LIFEADMIN_V08.md). No remote admin operations were added.

## LifeAdmin v0.9 — authenticated local Unix IPC telemetry

An opt-in **read-only Unix-domain socket** is available for local telemetry from the Node/C++/Lua game process to LifeAdmin. Requests use an HMAC-authenticated random nonce, and replies contain a signed snapshot bound to that nonce. LifeAdmin validates the snapshot and applies its existing LifeAccount `ADMIN_VIEW` policy before exposing any resource status.

Linux setup: supply `LIFE_TELEMETRY_IPC_PATH` pointing to a socket inside an operator-owned private directory (0700) and `LIFE_TELEMETRY_HMAC_KEY` (64 hexadecimal characters) to both game and admin processes. The local socket is read-only and no TCP admin port is introduced. The old signed file option remains available when IPC is not selected. Windows named-pipe support is **not yet implemented**.

New unit tests and a native C++/Lua → Unix IPC end-to-end test live in `tests/lifeadmin-local-ipc.test.js` and `tests/life-bridge-native-e2e.test.js`. The native test is skipped unless a compiled binary is configured. See [docs/LIFEADMIN_V09.md](docs/LIFEADMIN_V09.md) for setup, security boundaries and limitations. **Do not expose LifeAdmin port 4101 to the Internet.**

## LifeNetwork ENet + LifeInventory originale — primo incremento open source

- **ENet (MIT):** build C++ opzionale con `-DLIFE_ENABLE_ENET=ON`, libreria ENet fornita dal sistema e `lifenetwork-enet-smoke` registrato in CTest. Vedi `.github/workflows/enet.yml`. **Non** ha ancora sostituito la demo WebSocket o realizzato un server UDP pubblico.
- **LifeInventory:** modulo Node.js originale `lifeinventory/inventory.js` con catalogo, slot, peso, stack e operazioni atomiche; test in `tests/lifeinventory.test.js`. I giocatori **non** possono ancora chiamare queste operazioni: nessun endpoint è esposto prima di autenticazione e proprietà account realmente collegate.
- Il codice GPL-3.0 di `ox_inventory` non è stato copiato; ne abbiamo studiato soltanto funzioni generiche.

Istruzioni, licenze, limiti e prossimi passi: [docs/OPEN_SOURCE_INTEGRATIONS_V01.md](docs/OPEN_SOURCE_INTEGRATIONS_V01.md).

## LifeInventory transfer + ENet localhost packet exchange

Il modulo originale `lifeinventory` supporta ora trasferimenti **atomici in memoria** tra due inventari trusted con controllo delle revisioni, peso e slot. I test coprono duplicazioni, richieste obsolete e rifiuti senza modifiche parziali. Non è ancora collegato agli account autenticati o al database.

L'integrazione ENet ora contiene un vero **test client/server UDP soltanto su 127.0.0.1**, con richiesta e risposta tramite pacchetti affidabili. Il test è registrato in CTest quando `LIFE_ENABLE_ENET=ON` ed è incluso nel workflow ENet esistente. Non è stato creato alcun server UDP pubblico o client Android nativo.

Dettagli e istruzioni: [docs/LIFENETWORK_INVENTORY_V02.md](docs/LIFENETWORK_INVENTORY_V02.md).

## LifeInventory JDBC — dati persistenti per account/community

È stata introdotta una prima persistenza **Java 17 + PostgreSQL/MariaDB** distinta dal prototipo Node.js a slot: migrazione `004_inventory.sql`, inventari per `community_id + account_id`, saldo quantità per oggetto, revisioni e trasferimenti SQL transazionali con identificativo unico anti-replay.

`InventorySessionService` verifica una sessione LifeAccount e consente solamente letture e trasferimenti **dal proprietario del token**. Non esiste ancora una route HTTP/ENet per i giocatori e `grantFromTrustedServer` è destinato solo a logica server autorizzata. I limiti di peso e gli slot del prototipo Node non sono ancora persistiti nel ledger JDBC.

I test DB sono stati estesi per entrambe le varianti PostgreSQL e MariaDB, ma devono ancora essere verificati su CI. Leggi [docs/LIFEINVENTORY_JDBC_V01.md](docs/LIFEINVENTORY_JDBC_V01.md).

## PROJECT LIFE RP Alpha 1.2 — anteprima browser giocabile (incremento visibile)

È stato aggiornato **il client browser già disponibile sulla porta 3000**: nuova intestazione Alpha 1.2 Preview, HUD con giocatori online, mini-mappa in tempo reale, punti di riferimento originali (parco, piazza/fontana, ospedale), zona corrente e posizionamento iniziale coerente con le coordinate inviate dal server.

Per provarlo dal tuo Xiaomi 15T: apri GitHub Codespaces sul branch `main`, esegui `npm start`, apri la porta `3000` nel browser; aggiorna la scheda (eventualmente ricarica senza cache). **Niente APK né pannello amministrativo sul telefono.**

Questa è ancora una demo WebSocket browser non autenticata: non include LifeAccount JDBC, inventari persistenti, OneSync/LifeSync di produzione, veicoli guidabili, sistemi economici, server browser o abbonamenti. Non è la Alpha 1.2 completa e non è adatta a server pubblici a pagamento. I test HTTP/WebSocket sono stati estesi in `tests/server-smoke.test.js`.

## LifeServer Alpha 1.2 — configurazione PC-only e prime interazioni RP

Il server WebSocket della demo legge ora il file PC-side `config/server.json` (nome del server, messaggio, sviluppo privato e limite gratuito fisso di **50 giocatori simultanei**). Un limite superiore richiederà in futuro il servizio di licenze e abbonamenti; non è possibile attivarlo cambiando soltanto il file.

Sul client Android/browser sono presenti interazioni di prossimità con fontana, parco e ospedale: pulsante touch **Interagisci** o tasto **E** su PC. Il server controlla posizione e frequenza delle richieste. Non sono comandi amministrativi o modifiche al database.

Per provare: Codespaces `main`, `npm start`, porta `3000`, browser del telefono. Configurazione e gestione del server restano PC-only. Dettagli: [docs/LIFESERVER_ALPHA12_CONFIG_INTERACTIONS.md](docs/LIFESERVER_ALPHA12_CONFIG_INTERACTIONS.md).
