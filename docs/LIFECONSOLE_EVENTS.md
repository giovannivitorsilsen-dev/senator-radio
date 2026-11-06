# LifeConsole & LifeEvent — prototipo nativo C++17

## Cosa è disponibile

LifeConsole interpreta **solo** comandi consentiti: `help`, `list`, `status`, `start`, `ensure`, `stop`, `restart`. Non esegue comandi di sistema né apre socket. L'eseguibile locale permette di registrare risorse e dipendenze da riga di comando.

LifeEvent (`LifeEvents`) registra callback per nome evento e risorsa; supporta annullamento delle iscrizioni quando una risorsa viene fermata, un limite di 4096 byte al payload e un limite alle iscrizioni. Gli errori C++ di una callback vengono registrati senza interrompere le altre.

Queste API **non** sono ancora integrate con LifeLua, né con le connessioni WebSocket o il database. La console gestisce gli stati logici, non i processi o gli script.

## Compilazione Linux / Windows

```sh
cmake -S liveserver-cpp -B liveserver-cpp/build
cmake --build liveserver-cpp/build --config Debug
ctest --test-dir liveserver-cpp/build -C Debug --output-on-failure
```

## Uso locale

Linux:
```sh
./liveserver-cpp/build/lifeserver-console core jobs:core taxi:jobs
```
Windows (Debug):
```powershell
.\liveserver-cpp\build\Debug\lifeserver-console.exe core jobs:core taxi:jobs
```

Dopo l'avvio, scrivere `ensure taxi`, `list`, `status taxi`, `stop core`, `restart taxi` e `quit`.

**Sicurezza:** nessuna API amministrativa deve essere esposta a Internet finché non avremo autenticazione staff, autorizzazioni granulari, log persistenti, MFA, TLS e isolamento del runtime Lua. LifeAdmin rimane da sviluppare.
