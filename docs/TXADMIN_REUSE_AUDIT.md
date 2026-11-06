# PROJECT LIFE RP — audit txAdmin e prima integrazione LifeAdmin

Data: 6 novembre 2026.

## Origine e licenza
Repository ufficiale: https://github.com/citizenfx/txAdmin
Licenza MIT: https://github.com/citizenfx/txAdmin/blob/master/LICENSE
Copyright originale: (c) 2019-2025 Take-Two Interactive Software, Inc.
Il testo della licenza è conservato in `vendor/txadmin/LICENSE`.

## Codice realmente adattato
- Upstream: `core/lib/MemCache.ts` (txAdmin).
- LifeAdmin: `lifeadmin/core/mem-cache.js`.
- Modifiche: conversione TypeScript -> CommonJS, `structuredClone` nativo al posto di `lodash-es`, orologio iniettabile e controllo TTL.
- Il componente è utilizzato da `lifeadmin/core/status.js` per memorizzare brevemente lo stato locale.

## Audit moduli txAdmin
| Modulo upstream | Decisione | Motivazione |
| --- | --- | --- |
| `core/lib/MemCache.ts` | Adattato | Indipendente dal runtime FXServer |
| `core/lib/console.ts` | Non copiato | Sovrascrive console globale; dipendenze particolari e comportamenti txAdmin |
| `core/lib/diagnostics.ts` | Non copiato | Usa variabili globali txAdmin, FXServer e altre librerie |
| `core/modules/` e `core/routes/` | Da valutare | Richiedono adapter LifeServer e identità amministrative sicure |
| `panel/` React/Vite | Da valutare | Separare frontend dalla logica FXServer; audit delle dipendenze |
| `resource/`, `nui/` | Non importati | Eventi, native e UI integrate in FiveM |
| Suoni, icone e traduzioni | Non importati | Materiali e dipendenze con licenze da verificare separatamente |

## MVP LifeAdmin eseguibile
Il comando seguente verifica **solo** se la demo browser PROJECT LIFE RP risponde con HTTP 200 su `127.0.0.1:3000`:

```sh
npm start
# secondo terminale (PC, o terminale remoto su Codespaces)
node lifeadmin/cli.js status
npm test
```

Per una porta personalizzata: `LIFE_ADMIN_TARGET_PORT=3001 node lifeadmin/cli.js status`.

Il comando stampa ONLINE/OFFLINE, motivo e latenza; non espone endpoint web, non esegue comandi sul server, non identifica i giocatori. HTTP 200 **non** certifica che la simulazione, i database, gli script o l'autenticazione siano sani.

## Cosa manca
- LifeAdmin dashboard, admin login/MFA, ruoli e permessi per comunità in rete.
- Gestione risorse C++ dal pannello, shutdown, reboot, moderazione, backup, monitoraggio CPU/RAM.
- Adattatori per FXServer: non si possono importare direttamente senza rimuovere la dipendenza.
- Audit completo della catena di dipendenze e delle componenti visuali prima di qualsiasi ulteriore copia.
- La CLI va eseguita da un operatore PC, non dal client Android. Il gioco su Android rimane solo gameplay.

Non mettere online un pannello amministrativo finché non esistono autenticazione verificata, sessioni separate, TLS, protezioni CSRF, audit e autorizzazioni server-side.
