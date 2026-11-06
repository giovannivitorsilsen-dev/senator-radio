'use strict';
const $=id=>document.getElementById(id);
let busy=false;
async function refresh() {
  if(busy)return;
  busy=true;
  try {
    const response=await fetch('/api/status',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    const game=data.game;
    $('state').textContent=game.online?'ONLINE':'OFFLINE';
    $('state').className='value '+(game.online?'green':'red');
    $('reason').textContent=game.reason;
    $('latency').textContent=game.latencyMs+' ms';
    $('port').textContent=String(game.port);
    $('updated').textContent='Ultimo controllo: '+new Date(data.checkedAt).toLocaleTimeString('it-IT');
    $('message').textContent='Diagnostica aggiornata';
  } catch {
    $('state').textContent='Non disponibile';
    $('state').className='value red';
    $('message').textContent='Impossibile leggere lo stato locale';
  } finally {busy=false;}
}
$('refresh').addEventListener('click',refresh);
refresh();
setInterval(refresh,5000);
