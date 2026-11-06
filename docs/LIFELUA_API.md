# LifeLua v0.1 — contratto iniziale di scripting

La prima API del runtime C++ è intenzionalmente piccola.

```lua
RegisterEvent("rp:hello", function(playerName)
  Log("Benvenuto, " .. playerName)
end)
```

Il server chiama `LuaHost.emit("rp:hello", "Giocatore")`. L'evento viene consegnato alle risorse attive che lo hanno registrato.

## API realmente presenti
- `RegisterEvent(name, callback)`: registra una callback per un nome di evento valido. Una seconda registrazione con lo stesso nome sostituisce la precedente **nella medesima risorsa**.
- `Log(message)`: aggiunge un messaggio al buffer della risorsa (fino a 128 messaggi, 256 byte per messaggio).
- `LuaHost.add(name, dependencies, source)`: registra un sorgente Lua selezionato dal server fidato.
- `LuaHost.start(name)`: carica le risorse mancanti e le loro dipendenze; in caso di errore di caricamento non le considera attive.
- `LuaHost.stop(name)`: impedisce di fermare una risorsa ancora richiesta da altre.
- `LuaHost.restart(name)`: riavvia una risorsa che non è richiesta da un'altra risorsa attiva.
- `LuaHost.emit(name, payload)`: invia un messaggio **stringa** alle callback registrate.

## Limitazioni di sicurezza
- Ogni risorsa usa un proprio stato Lua ma **non un proprio processo OS**.
- Le librerie `io`, `os`, `package`, `debug`, `coroutine` e le funzioni di caricamento dinamico sono rimosse dallo spazio globale. Questo **non dimostra** isolamento completo dal processo ospite.
- Memory cap iniziale: 4 MiB per stato; budget approssimativo: 100.000 istruzioni Lua per chiamata. Questi limiti non sostituiscono un sandbox di processo sicuro.
- Le risorse **non** possono accedere direttamente al database, ai poteri staff o ai Supporter. Non esiste ancora un'API per concedere privilegi.
- Questa versione non include networking Lua, eventi FiveM, comandi amministrativi, script firmati, Lua client-side o interoperabilità con il server Node.js.
- L'esecuzione di script di terze parti sconosciute non è autorizzata in produzione finché non esiste un servizio di isolamento e autorizzazione separato.

## Test e build
È richiesto Lua 5.4 con header di sviluppo. Linux CI installa `liblua5.4-dev`, configura `LIFE_ENABLE_LUA=ON` e avvia CTest. Windows compila per ora il manager base senza runtime Lua. I test pubblicati non equivalgono a un esito CI già confermato.

## Compatibilità FiveM
ESX, QBCore e vRPex richiedono un layer eventi e un adattatore per ogni API specifica. Le native di GTA V non sono disponibili automaticamente. Nessuna compatibilità diretta è dichiarata in questa versione.
