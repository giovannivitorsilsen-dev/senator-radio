# LifePermissions v0.5 — permessi per risorsa Lua

## Confine di fiducia

Solo il **processo server fidato** registra le risorse e le loro capacità con `LuaHost.add(name, dependencies, source, capabilities)` oppure `LifeRuntime.add(name, dependencies, source, eventNames, capabilities)`. I giocatori e gli script non possono concedersi autonomamente nuove capacità. Le risorse hanno insiemi di permessi separati e nessuna concessione implicita.

## API Lua implementate

```lua
assert(HasCapability("chat.notice"))
local ok = RequestAction("chat.notice", "Messaggio di prova")
assert(ok)
assert(not RequestAction("staff.ban", "player-id"))
```

- `HasCapability(name)` restituisce true solo se il server ha attribuito quella capacità a **quella risorsa**.
- `RequestAction(name, payload)` oggi implementa **solo** `chat.notice`, che aggiunge il testo al log locale della risorsa. Non invia ancora messaggi al client; non è un webhook, una chiamata al database, né un comando di sistema.
- Le capacità come `staff.ban`, `economy.write`, `vehicle.transfer`, `supporter.grant` non hanno **nessuna operazione di esecuzione**. Anche un nome di capacità concesso in futuro non aggira i controlli di account, community e acquisti.
- Lunghezza massima per nome capacità: 64 caratteri; limite per testo demo: 160 byte. Nessun wildcard. Massimo 32 concessioni per risorsa.
- Un nome giocatore non autenticato, proveniente dal browser, non conferisce identità, ownership o staff.

## Test

```sh
cmake -S liveserver-cpp -B liveserver-cpp/build
cmake --build liveserver-cpp/build
ctest --test-dir liveserver-cpp/build --output-on-failure
```

Per il test delle API Lua installare Lua 5.4 e i relativi header, poi configurare `-DLIFE_ENABLE_LUA=ON`. Vedi `docs/LIFERUNTIME_INTEGRATION.md`.

## Prossimi passi obbligatori

1. Autenticazione verificata con account/sessione Java, applicando limiti e verifica di origine agli eventi di rete.
2. Connessione autenticata fra LifeServer C++ e i servizi JDBC Java, senza accesso SQL diretto degli script.
3. Ogni vera operazione RP deve autorizzare **identità verificata + community + risorsa + azione + oggetto** nel backend autorevole.
4. Audit persistente, idempotenza, isolamento OS degli script e revisione di sicurezza prima di esporre API staff, supporter, inventario, veicoli o economia.

**Non è una sandbox completa.** Le VM Lua risiedono ancora nello stesso processo nativo. Non caricare script di terzi non fidati o rendere pubblica l'amministrazione. Le verifiche CI devono essere confermate prima di dichiarare una build stabile.
