# LifeAdmin v0.6 — risorse Lua multiple, dipendenze ed errori

## Nuove funzionalità
Il bridge sperimentale C++/Lua supporta ora fino a 16 risorse locali totali: la risorsa base `welcome` e fino a 15 risorse aggiuntive dichiarate **solo dall'operatore**. Il server valida i nomi e le dipendenze, carica il codice con `LifeRuntime` e trasmette il risultato di `runtime.running(name)` per ogni risorsa.

Il formato dei messaggi stdout è limitato a:
- `RESOURCE nome STARTED [dipendenza1,dipendenza2]`
- `RESOURCE nome STOPPED [dipendenza1,dipendenza2]`
- `ERROR runtime startup` oppure `ERROR runtime callback`
- `PONG` e `EVENT_OK`

Il bridge Node interpreta solo messaggi stdout del processo C++ avviato localmente, salva lo snapshot JSON nel percorso privato scelto dall'operatore e controlla la freschezza. La dashboard dietro LifeAccount e `ADMIN_VIEW` visualizza risorse, dipendenze e categorie generiche d'errore.

**Non è ancora una console remota:** non esistono route HTTP per avviare, fermare, caricare codice Lua o modificare la configurazione. Nessun client Android ottiene poteri amministrativi.

## Esempio operativo Codespaces/Linux
Prima compila C++/Lua come descritto in [LIFEADMIN_V05.md](LIFEADMIN_V05.md). Configura Java/JDBC + account autorizzato secondo [LIFEADMIN_V03.md](LIFEADMIN_V03.md).

```sh
mkdir -p "$HOME/.local/state/life-rp"
chmod 700 "$HOME/.local/state/life-rp"
export LIFE_RESOURCE_STATUS_FILE="$HOME/.local/state/life-rp/resources.json"
export LIFE_LUA_BRIDGE=1
export LIFE_LUA_BRIDGE_BIN="$PWD/liveserver-cpp/build-lua/lifeserver-lua-bridge"
export LIFE_LUA_SCRIPT="$PWD/liveserver-cpp/examples/welcome.lua"
export LIFE_LUA_EXTRA_RESOURCES='["taxi:welcome=liveserver-cpp/examples/taxi.lua"]'
npm start
```

In un terminale distinto sul **PC amministrativo**, esporta lo stesso percorso `LIFE_RESOURCE_STATUS_FILE` e le variabili Java/JDBC, poi `npm run admin`. **La porta 4101 non deve essere inoltrata o resa pubblica su Codespaces.** La demo multiplayer rimane sulla porta 3000.

Le specifiche aggiuntive sono stringhe `name:dependency1,dependency2=percorso_script.lua`; senza dipendenze: `name=percorso_script.lua`. Sono dichiarazioni locali fidate, non input da giocatori. Nel prototipo il nome `welcome` è riservato al primo file Lua.

## Limitazioni importanti
- Il bridge mantiene le risorse nello **stesso processo nativo**, non è un sandbox per script di terzi.
- L'evento `rp:hello` è ancora originato da nomi non autenticati della demo e non autorizza dati RP, denaro, staff, inventario o supporter.
- Gli errori contengono solo una **categoria generica**; non log o stack trace Lua potenzialmente sensibili.
- Lo snapshot è osservazione diagnostica, **non prova crittografica**, e un processo locale sotto lo stesso utente potrebbe alterarlo.
- Se il bridge termina inaspettatamente, i vecchi stati di risorse non restano segnalati come attivi. Se non arrivano heartbeat recenti, dopo 10 secondi la dashboard declassa le informazioni a sconosciute.
- Il bridge non implementa ancora deploy dinamico, riavvio remoto, supervisione isolata, metriche di memoria per risorsa o stato autentico di tutte le community.
- L'integrazione Linux C++/Lua e la nuova CI devono essere compilate ed eseguite prima di dichiarare il rilascio stabile.

## Test
```sh
npm test
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
```

I test JavaScript verificano messaggi multipli, limiti, dipendenze, crash, errori generici, mancata esposizione dei dettagli e accesso alla dashboard protetto. Il passo successivo sarà consolidare la CI e collegare il vero lifecycle di LifeServer tramite IPC locale autenticato.
