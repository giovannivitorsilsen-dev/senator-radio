# LifeServer / LifeAdmin v0.9 — IPC locale autenticato (Linux)

## Cosa è stato aggiunto

Una nuova modalità di telemetria **senza file JSON condivisi**: il processo di gioco Node.js espone un socket Unix locale, che il processo LifeAdmin interroga per recuperare lo stato corrente del bridge Lua C++.

Il protocollo ammette soltanto **una lettura dello stato**:
1. LifeAdmin genera una sfida casuale di 128 bit.
2. Invia la sfida più un HMAC-SHA256 calcolato sulla stringa `lifeadmin:read:<nonce>`.
3. Il processo del gioco verifica l'HMAC con una chiave condivisa privata.
4. Restituisce uno snapshot firmato HMAC che contiene la stessa sfida.
5. LifeAdmin verifica firma e corrispondenza della sfida, quindi riutilizza la validazione già disponibile per schema, nomi, dipendenze, timestamp e obsolescenza.

Il canale non consente `start`, `stop`, `restart`, valutazione di Lua, comandi shell, login, operazioni su soldi o privilegi staff. Il collegamento browser al server amministrativo resta sotto `LifeAccount` e `ADMIN_VIEW`.

## Avvio Linux / Codespaces in laboratorio

Compila e verifica C++/Lua prima di abilitare il bridge, seguendo `docs/LIFEADMIN_V08.md`.

Configura *la stessa chiave segreta* in un ambiente privato su entrambi i processi. Esempio per generarla in un terminale fidato:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Crea una cartella privata, del proprietario del processo, con permessi 0700:

```sh
mkdir -p "$HOME/.local/state/life-rp"
chmod 700 "$HOME/.local/state/life-rp"
export LIFE_TELEMETRY_IPC_PATH="$HOME/.local/state/life-rp/status.sock"
export LIFE_TELEMETRY_HMAC_KEY='<64 caratteri esadecimali, non committare>'
export LIFE_LUA_BRIDGE=1
export LIFE_LUA_BRIDGE_BIN="$PWD/liveserver-cpp/build-lua/lifeserver-lua-bridge"
export LIFE_LUA_SCRIPT="$PWD/liveserver-cpp/examples/welcome.lua"
export LIFE_LUA_EXTRA_RESOURCES='["taxi:welcome=liveserver-cpp/examples/taxi.lua"]'
npm start
```

In un secondo terminale della **stessa macchina**, configura `LIFE_TELEMETRY_IPC_PATH`, `LIFE_TELEMETRY_HMAC_KEY` e le variabili Java/JDBC di `docs/LIFEADMIN_V03.md`, quindi `npm run admin`. LifeAdmin sceglie l'IPC se `LIFE_TELEMETRY_IPC_PATH` è definito; non tenta un fallback trasparente al file quando l'IPC fallisce. Visualizza invece `ipc-unavailable` e stati non confermati.

**Non pubblicare la porta 4101 di LifeAdmin, neppure tramite Codespaces Ports o un tunnel.** L'accesso amministrativo è PC-only. Il telefono rimane per il gameplay.

## Sicurezza e limitazioni
- Questo primo IPC usa **Unix-domain socket su Linux/macOS**; il supporto a named pipe Windows non è ancora implementato. Su Windows resta il precedente snapshot locale con HMAC.
- La directory del socket deve appartenere al processo e non essere accessibile a gruppo/altri. Il socket viene reso 0600. Non verrà cancellato automaticamente un file o socket già esistente durante l'avvio: l'operatore deve verificare e rimuovere manualmente un eventuale socket vecchio dopo essersi assicurato che nessun processo lo usi.
- Il protocollo limita le connessioni, le dimensioni dei messaggi e i timeout. Le sfide casuali impediscono il riutilizzo di una risposta osservata per una diversa richiesta.
- La chiave è condivisa tra i due processi: **non** viene caricata nel browser, nel client Android o nel repository. Un aggressore con accesso al processo/utente OS o alla chiave può comunque alterare dati e non è fermato da un HMAC.
- Manca ancora verifica delle credenziali del peer dal sistema operativo (SO_PEERCRED), isolamento per risorsa Lua, supervisore come servizio OS, backup e audit protetto.
- Le informazioni riguardano il bridge C++/Lua dimostrativo, non un runtime multi-community production-ready.
- Nessun endpoint di controllo remoto è stato aggiunto.

## Verifica

```sh
npm test
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON -DCMAKE_BUILD_TYPE=Debug
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
LIFE_CPP_BRIDGE_BIN="$PWD/liveserver-cpp/build-lua/lifeserver-lua-bridge" npm test
```

I nuovi test `tests/lifeadmin-local-ipc.test.js` coprono richieste firmate, chiavi errate, comandi negati, permessi del socket, assenza del processo e condizioni di errore. `tests/life-bridge-native-e2e.test.js` include un test con il vero bridge C++/Lua e l'IPC, che è **saltato** senza l'eseguibile compilato.
