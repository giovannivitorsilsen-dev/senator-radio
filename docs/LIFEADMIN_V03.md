# LifeAdmin v0.3 — accesso amministrativo basato su LifeAccount

## Stato
La dashboard passa da monitor pubblico su loopback a **visualizzazione della diagnostica solo dopo verifica Java**.
Ogni chiamata `GET /api/status` ricontrolla la sessione Java e il permesso `ADMIN_VIEW` per la community configurata.
Se un servizio Java/SQL non è configurato, l'accesso viene **sempre negato**.

L'interfaccia accetta un token di sessione LifeAccount **già creato**. Non crea account, non effettua password login e non fornisce MFA. L'autenticazione resta separata dal client Android.

## Configurazione

Prerequisiti: schema e migrazioni in `database/postgresql` o `database/mariadb`; account e sessioni creati usando `AccountAuth`; community e permesso `ADMIN_VIEW` concessi dal proprietario usando `CommunityJdbc`. Il proprietario della community supera il controllo dei permessi con il metodo `hasStaffPermission`.

Compila Java e scarica le dipendenze JDBC:
```sh
mvn -B -f core-java/pom.xml package dependency:copy-dependencies -DoutputDirectory=target/dependency
```

Da Linux/Codespaces, solo in terminale trusted:
```sh
export LIFE_JDBC_URL='jdbc:postgresql://127.0.0.1:5432/liferp'
export LIFE_JDBC_USER='life_local'
export LIFE_JDBC_PASSWORD='<password locale, non commit>'
export LIFE_ADMIN_COMMUNITY_ID='<UUID della community>'
export LIFE_ADMIN_JAVA_CLASSPATH='core-java/target/classes:core-java/target/dependency/*'
npm run admin
```

Su Windows il separatore del classpath è `;` al posto di `:`. Usa variabili d'ambiente o un gestore segreti, mai file pubblici nel repository.

Apri `http://127.0.0.1:4101` **sulla macchina che ospita il pannello**, inserisci un token LifeAccount valido e autorizzato. Il token viene inviato al server locale e mantenuto solamente in RAM lato server per una sessione al massimo di 5 minuti. Il cookie del browser è `HttpOnly`, `SameSite=Strict`; l'interfaccia non salva il token in localStorage.

## Sicurezza e limitazioni
- Solo bind loopback; controlli Host e Origin; limiti iniziali a 5 tentativi/minuto; assenza di endpoint di modifica del gioco.
- Il pannello non ha TLS: **non usare port forwarding, Codespaces port visibility Public, tunnel, proxy, accesso tramite smartphone, o reti non fidate**. Loopback non sostituisce un'autenticazione di produzione.
- Il controllo staff è effettuato **per community**, non per nome giocatore.
- Il processo Java viene lanciato localmente ad ogni controllo e riceve il token via stdin, non negli argomenti.
- Le credenziali JDBC devono essere disponibili al processo Java e protette dal sistema operativo.
- Le sessioni amministrative sono temporanee e locali ma **non includono MFA** o protezione completa contro furto di token, attacchi locali, brute-force distribuito e incident response.
- L'autenticazione del browser multiplayer Node.js è ancora da integrare; un nickname non è una sessione LifeAccount.
- Il modulo `ADMIN_VIEW` consente solo di leggere diagnostica HTTP. Non autorizza ban, kick, privilegi staff, economia, supporter o gestione processi.

## Test
```sh
npm test
```
I test di `tests/lifeadmin-auth.test.js` usano un verificatore simulato per provare gli stati HTTP. Il test Java con PostgreSQL/MariaDB reali rimane da validare tramite CI e configurazione database.
