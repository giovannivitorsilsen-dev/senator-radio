# LifeServer v0.3 — LifeConsole + LifeEvent + LifeLua

## Cosa funziona nel prototipo C++

- `LifeRuntime.add(name, dependencies, source, events)`: registra una risorsa trusted, le dipendenze e gli eventi consentiti.
- `LifeRuntime.start(name)`: carica e avvia le dipendenze e gli script Lua prima di abilitare i relativi handler degli eventi.
- `LifeRuntime.stop(name)`: ferma l'esecuzione della risorsa, blocca la rimozione di dipendenze in uso e annulla le iscrizioni agli eventi.
- `LifeRuntime.restart(name)`: riavvia una risorsa, ricaricando lo stato Lua quando non è richiesta da risorse dipendenti.
- `LifeRuntime.publish(event, payload)`: inoltra eventi solo alle risorse attive che hanno dichiarato il nome evento.
- `LifeRuntimeConsole.execute(command)`: `start`, `ensure`, `stop`, `restart`, `status`, `list`, `logs`, `emit`.
- Gli errori di una callback Lua vengono registrati e non interrompono gli handler delle altre risorse.

## Eseguire dal terminale Codespaces (Linux)

Requisiti: compilatore C++17, CMake, header e libreria Lua 5.4. Su Ubuntu:

```sh
sudo apt-get update
sudo apt-get install -y cmake g++ liblua5.4-dev
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
./liveserver-cpp/build-lua/lifeserver-lua-console liveserver-cpp/examples/taxi.lua
```

Nella console di prova:

```
ensure taxi
emit rp:hello Mario
logs taxi
stop taxi
quit
```

I comandi amministrativi sono disponibili **solo nella console locale**; non esiste un'API remota né un accesso da Android.

## Limiti verificabili

Non è ancora un sostituto di FXServer. La prima versione dell'eseguibile riceve percorsi di file Lua scelti dall'operatore, e per semplicità dichiara l'evento `rp:hello` per ciascuno; il manifest completo delle risorse deve ancora essere realizzato.

Le VM Lua sono nello stesso processo C++: i controlli attuali non sono una sandbox sicura per risorse scaricate da sconosciuti. Non vi sono script ESX/QBCore/vRPex eseguibili, chiamate native GTA V, supporto Lua client, networking LifeSync, database collegato o pannello LifeAdmin. I test GitHub Actions sono configurati, ma i risultati vanno consultati nella scheda Actions prima di dichiarare una build stabile.
