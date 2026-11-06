# PROJECT LIFE RP — Codespaces multiplayer test

Versione di prova **autonoma e ridotta** per verificare dal browser Android e PC il collegamento multiplayer. **Non è la Alpha 1.1 completa**: il pacchetto integrale resta disponibile nel file ZIP consegnato in chat e non è ancora stato trasferito in questo repository.

## Avvio
1. GitHub: **Code → Codespaces → Create codespace on main**.
2. Nel terminale esegui `npm start`.
3. Apri **Ports**, seleziona la porta `3000`, copia l'URL HTTPS.
4. Apri il link dal tuo Xiaomi 15T; per provare con un amico, rendi temporaneamente la porta **Public** e condividi il link.
5. Ferma Codespaces quando non giochi, per non consumare la quota.

Il prototipo ha un quartiere 3D semplice, joystick touch, WASD da PC, personaggi condivisi e chat. Nessun accesso amministrativo è pubblicato; non sono implementate autenticazione e anti-cheat di produzione.

La mappa Demo City di Unity **non è inclusa**. Non caricare password, chiavi o asset licenziati in questo repository pubblico.

## Risorse
Per sostituire questa demo con la Alpha 1.1 completa, bisogna caricare i sorgenti dello ZIP `project_life_rp_alpha_11_pc_3d_editor.zip` nel repository. Il file ZIP rimane disponibile nella conversazione.

## Nuovo nucleo sperimentale (C++, C, Lua, Java)

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — struttura tecnica e sicurezza.
- [`core-java/`](core-java/) — regole LifeStaff e LifeSupporter, test Java 17.
- [`native/`](native/) — interfaccia C e componente di movimento utilizzato da C++.
- [`scripts-lua/`](scripts-lua/) — esempio di contratto per futuri script delle community.

**Attenzione:** questi moduli sono prototipi separati. Non sono ancora collegati al server multiplayer Node.js, non sono stati collaudati tramite CI e non forniscono ancora compatibilità ESX/QBCore/vRPex eseguibile.
