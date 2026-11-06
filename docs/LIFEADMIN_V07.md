# LifeAdmin v0.7 — supervisione locale, timeout e registro diagnostico

## Cosa cambia

Il bridge Node.js che ospita il processo C++/Lua ora applica un watchdog locale:
- Invia `PING` ogni 3 secondi (predefinito).
- Riceve `PONG` e frame `RESOURCE` dal processo C++ fidato.
- Se nessuna risposta attendibile arriva per oltre 10 secondi, segnala `runtime heartbeat timeout`, declassa lo stato a **non disponibile** e richiede la terminazione del processo bloccato.
- **Non esegue riavvii automatici**; così non entra in cicli incontrollati di crash/restart.
- Pubblica nel file diagnostico locale: uptime del bridge, conteggio dei PING, eventi `EVENT_OK`, errori e istante dell'ultima risposta.
- LifeAdmin valida numeri e timestamp, e mostra questi contatori solo dopo la verifica LifeAccount e permesso community `ADMIN_VIEW`. Se il file è obsoleto o invalido, nessuna risorsa viene presentata come attiva.

## Registro eventi opzionale

Il parametro `LIFE_SUPERVISOR_AUDIT_FILE` abilita un journal locale JSON Lines:
```sh
mkdir -p "$HOME/.local/state/life-rp"
chmod 700 "$HOME/.local/state/life-rp"
export LIFE_SUPERVISOR_AUDIT_FILE="$HOME/.local/state/life-rp/supervisor-events.jsonl"
```
L'operatore può visualizzarlo **dal terminale PC**, non dalla dashboard browser pubblica. Contiene solo `at`, `type` e `resource`: avvio/arresto risorse, categorie di errore Lua, timeout e indisponibilità del bridge. Nessun nickname, chat, token, password o stack trace. Il file è creato in modalità 0600 sui sistemi POSIX, con un tetto di circa 128 KiB per impedire crescita indefinita; raggiunta la soglia non registra più eventi. La directory deve essere privata.

**Non è un audit di sicurezza di produzione:** non è firmato, non è append-only protetto da modifiche locali, non registra identità di amministratori o azioni RPC e può essere alterato da altri processi con gli stessi permessi OS. Non va usato per risolvere dispute staff/pagamenti.

## Test

```sh
npm test
```

Le suite `tests/lifeadmin-supervisor.test.js` e `tests/lifeadmin-supervisor-journal.test.js` coprono heartbeat, mancata risposta, terminazione, metriche, dati non validi, journal limitato e assenza di dettagli dei giocatori.

Per compilare il bridge C++ e provare il percorso completo su PC/Codespaces:
```sh
sudo apt-get install -y cmake g++ liblua5.4-dev
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
```

Continua a seguire `docs/LIFEADMIN_V06.md` per le variabili del bridge, e `docs/LIFEADMIN_V03.md` per la configurazione Java/JDBC della dashboard.

## Limitazioni

- Le metriche descrivono il **processo bridge Lua della demo**, non l'intero mondo RP né la performance dei client Android/PC.
- Mancano ancora isolamento OS del runtime, process supervisor di sistema, recupero automatico controllato, autentica autenticazione del gioco, MFAs staff e telemetria di più community.
- Gli snapshot e il journal sono file locali di diagnostica, non un protocollo IPC autenticato.
- La dashboard LifeAdmin resta **PC-only, loopback e sola lettura**. Non pubblicare la porta 4101 su Codespaces o tramite tunnel; Android rimane esclusivamente per il gameplay.
- Lo stato dei test GitHub Actions deve essere verificato prima di dichiarare il codice pronto per produzione.

## Priorità v0.8

Eliminare dipendenze dal filesystem condiviso passando a un canale IPC locale autenticato, isolare ogni risorsa Lua in processi protetti, verificare il ciclo di vita C++ end-to-end e introdurre telemetria con audit centralizzato prima di qualsiasi comando remoto.
