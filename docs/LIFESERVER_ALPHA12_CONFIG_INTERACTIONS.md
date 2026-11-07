# LifeServer Alpha 1.2 — configurazione self-hosted e interazioni RP

## Stato
Implementato un primo passaggio reale fra la demo Android/browser e un file di configurazione del server gestito dal proprietario dal **PC**.

La demo viene ancora avviata da `npm start` e utilizza WebSocket; **non** è una release completa del server dedicato C++/Lua/Java.

## Configurazione del server
Il proprietario modifica sul PC il file `config/server.json`:

```json
{
  "schema": 1,
  "serverName": "PROJECT LIFE RP — Demo City",
  "maxPlayers": 50,
  "mode": "development",
  "visibility": "private",
  "motd": "Anteprima Alpha 1.2: esplora la città e prova le interazioni RP."
}
```

Il server carica la configurazione all'avvio e valida ogni campo. Nella demo attuale `maxPlayers` è fissato a **50** per il piano gratuito: modificare il file a 100, 200, 500 o 3000 impedisce l'avvio. Non esiste ancora una licenza a pagamento, un servizio di pagamento o un sistema di verifica remota. Le future tariffe proposte restano 50 gratuito, 100 €15,99, 200 €29,99, 500 €59,99 e 3000 €99,99 mensili, hosting a carico del proprietario.

`visibility: private` indica soltanto lo stato della configurazione del prototipo: **non equivale a un firewall o a un'autenticazione reale**. Il gioco Node.js continua ad ascoltare su `0.0.0.0`; Codespaces mantiene la porta privata per impostazione predefinita.

## Gameplay visibile
Il client browser include già una minimappa e mostra la zona corrente. Il nuovo incremento aggiunge:
- pulsante touch **Interagisci** (tasto `E` da PC) quando ci si trova vicino a un punto RP;
- messaggi contestuali per **fontana della piazza**, **parco cittadino** e **ospedale**;
- controllo server-side della distanza massima di 8 unità e cooldown di 1 secondo contro richieste automatiche;
- nome del server, massimo giocatori e messaggio di benvenuto inviati dal server al client.

Il sistema di interazione è dimostrativo: non sposta oggetti, non modifica denaro e non accede a LifeInventory, LifeAccount o LifeAdmin.

## Verifica
```sh
npm install
npm test
npm start
```

Su Xiaomi 15T aprire il Codespace sul branch `main`, avviare `npm start`, poi aprire il collegamento HTTPS della porta 3000. I pannelli amministrativi PC non sono serviti dal client. I test `tests/lifeserver-config.test.js` e `tests/server-smoke.test.js` controllano configurazione, limite gratuito, HUD e rifiuto delle interazioni lontane.

## Prossime attività
- Installer/server artifact Windows e Linux e struttura standard delle risorse.
- Identità e sessioni di gioco sicure collegate al Java Core.
- Server registry e discovery su LifePlatform, senza gestire l'hosting degli utenti.
- LifeSync nativo e sistema autorizzato di licenze/abbonamenti.
- Client nativo Android/PC e asset streaming con contenuti originali/licenziati.

Questo è codice sperimentale. Non considerare l'applicazione pronta per un server RP pubblico o commerciale.
