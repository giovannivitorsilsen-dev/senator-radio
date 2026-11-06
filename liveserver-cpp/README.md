# LifeServer — C++ Resource Manager + embedded Lua prototype

Compilazione base Linux/Windows:
```sh
cmake -S liveserver-cpp -B liveserver-cpp/build
cmake --build liveserver-cpp/build
ctest --test-dir liveserver-cpp/build --output-on-failure
```

Runtime Lua **opzionale** (richiede header e libreria Lua 5.4):
```sh
cmake -S liveserver-cpp -B liveserver-cpp/build-lua -DLIFE_ENABLE_LUA=ON
cmake --build liveserver-cpp/build-lua
ctest --test-dir liveserver-cpp/build-lua --output-on-failure
```

Implementato: macchine Lua 5.4 distinte per risorsa, registrazione di eventi tramite `RegisterEvent(name, callback)`, log limitati tramite `Log(message)`, eventi inviati dal server tramite `LuaHost.emit`, dipendenze/avvio/arresto/riavvio logici; gestione errori in fase di caricamento, budget approssimativo di istruzioni e memoria per VM, disabilitazione delle librerie Lua standard più rischiose.

**Non è una sandbox affidabile per script non fidati.** Il runtime Lua vive nello stesso processo nativo; servono isolamento di processo, limiti OS, capability-based APIs, timeout, monitoraggio e review di sicurezza prima di eseguire codice di terze parti. Non pubblicare risorse arbitrarie scaricate da Internet. Non ci sono ancora networking nativo, sincronizzazione OneSync, API GTA/FiveM, compatibilità ESX/QBCore/vRPex o integrazione con il server Node.js/servizio Java.

Le build Windows per ora verificano il gestore C++ di base; il test Lua è predisposto per Linux con Lua 5.4 installato.
