# LifeAdmin v0.5 — stato osservato del bridge C++/Lua

## Funzionalità realmente disponibili
Questa iterazione collega un pezzo di **runtime C++ reale** alla dashboard Java-gated:
- `lifeserver-lua-bridge` esegue una risorsa Lua locale denominata `welcome`, invia `RESOURCE welcome STARTED` su stdout dopo l'avvio e risponde ai controlli periodici `PING` con un nuovo stato.
- Il bridge Node.js interpreta soltanto frame stdout **del processo avviato dall'operatore** e, se configurato, pubblica un piccolo snapshot JSON tramite scrittura atomica in un file locale.
- LifeAdmin legge il file, valida schema, dimensione, contenuto e freschezza (massimo 10 secondi), e mostra `welcome` come **avviata** soltanto se confermata recentemente dal C++.
- Se la telemetria non è configurata, è danneggiata, è vecchia o il bridge non è disponibile, lo stato torna a **sconosciuto**; gli elementi del catalogo configurato non vengono promossi ad attivi.
- `GET /api/resources` è protetto dal medesimo controllo LifeAccount Java e permesso community `ADMIN_VIEW` di LifeAdmin v0.4. Nessuna route per avviare, fermare, ricaricare o amministrare risorse è esposta.

## Avvio sperimentale da un PC Linux o Codespaces (NON esporre LifeAdmin)

Richiesti Node.js 18+, CMake, compilatore C++17, Lua 5.4 e configurazione Java/JDBC della [v0.3](LIFEADMIN_V03.md).

```sh
sudo apt-get update && sudo apt-get install -y cmake g++ liblua5.4-dev
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
npm install
```

Scegli un percorso **assoluto, locale e privato**, accessibile solo ai processi game/admin dello stesso operatore. Esempio Linux:
```sh
mkdir -p "$HOME/.local/state/life-rp"
chmod 700 "$HOME/.local/state/life-rp"
export LIFE_RESOURCE_STATUS_FILE="$HOME/.local/state/life-rp/resources.json"
export LIFE_LUA_BRIDGE=1
export LIFE_LUA_BRIDGE_BIN="$PWD/liveserver-cpp/build-lua/lifeserver-lua-bridge"
export LIFE_LUA_SCRIPT="$PWD/liveserver-cpp/examples/taxi.lua"
npm start
```

In un secondo terminale PC, usa lo **stesso percorso** `LIFE_RESOURCE_STATUS_FILE` ed esporta anche le variabili Java/JDBC come in `LIFEADMIN_V03.md`, poi avvia:
```sh
npm run admin
```

Apri `http://127.0.0.1:4101` dal browser dello **stesso PC**. Accedi con una sessione LifeAccount autorizzata, seleziona la vista risorse. Dovresti vedere `welcome` confermata avviata, mentre `core` e `taxi` del catalogo rimangono non connesse.

In Codespaces è possibile compilare e testare dal terminale, ma **non pubblicare la porta 4101 né inoltrarla su Internet**; non usare il pannello da smartphone. Android rimane solo per giocare.

## Sicurezza e correttezza dei dati
- La telemetria è un **file locale diagnostico**, non una prova crittografica: un altro processo con lo stesso account OS può modificarlo. Non usarlo per autorizzare operazioni, concedere ruoli o pagamenti.
- Lo stato è **confermato dall'istanza del bridge C++ della demo**, non da tutte le risorse registrate nel futuro LifeServer. Non dimostra salute completa dello script, prestazioni, database o sicurezza anti-cheat.
- Il nome Lua in questo bridge sperimentale è sempre `welcome`, anche quando si carica il file `taxi.lua`. Il nome `taxi` nel catalogo rappresenta soltanto un esempio.
- Il file non contiene player name, session token, password né dati di chat.
- Processi interrotti o heartbeat bloccati possono lasciare un file sul disco; una lettura oltre 10 secondi dalla conferma mostra dati `stale` e non segnala una risorsa attiva.
- Le sessioni Java e i controlli `ADMIN_VIEW` sono richiesti a ogni GET; mancano ancora MFA, un runtime isolato per gli script e qualsiasi controllo remoto di risorse.

## Test
```sh
npm test
```
I test `tests/lifeadmin-runtime-telemetry.test.js` verificano ricezione da stdout, assenza di autorizzazione via client, scadenza, input non valido, exit del child e gestione del percorso di telemetria. Gli esiti GitHub Actions vanno verificati separatamente.

## Verso un LifeAdmin simile a txAdmin
La prossima iterazione dovrà collegare **tutto** il lifecycle C++ (più risorse e dipendenze), errori di runtime e monitoraggio stabile tramite IPC autenticato locale, anziché un singolo bridge della demo. Successivamente potremo aggiungere azioni di amministrazione con autorizzazione server-side, audit e controlli di sicurezza.
