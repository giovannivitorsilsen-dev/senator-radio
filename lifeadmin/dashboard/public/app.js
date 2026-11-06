'use strict';
const $=id=>document.getElementById(id);
let busy=false;
function showAuthorized(value) {
  $('login-panel').hidden=value;
  $('dashboard-panel').hidden=!value;
}
async function refresh(){
  if(busy)return;
  busy=true;
  try{
    const response=await fetch('/api/status',{cache:'no-store',credentials:'same-origin'});
    if(response.status===401||response.status===403){showAuthorized(false);return;}
    if(!response.ok)throw Error('status');
    const data=await response.json();
    showAuthorized(true);
    const game=data.game;
    $('state').textContent=game.online?'ONLINE':'OFFLINE';
    $('state').className='value '+(game.online?'green':'red');
    $('reason').textContent=game.reason;
    $('latency').textContent=game.latencyMs+' ms';
    $('port').textContent=String(game.port);
    $('updated').textContent='Ultimo controllo: '+new Date(data.checkedAt).toLocaleTimeString('it-IT');
    $('message').textContent='Diagnostica aggiornata';
    $('admin-process').textContent='Processo LifeAdmin: '+data.adminProcess.uptimeSeconds+
      ' s · '+data.adminProcess.memoryRssMiB+' MiB RAM (non LifeServer)';
    const catalogRes=await fetch('/api/resources',{cache:'no-store',credentials:'same-origin'});
    if(catalogRes.ok) {
      const catalog=await catalogRes.json();
      const container=$('resources');
      container.replaceChildren();
      if(catalog.resources.length===0) container.textContent='Nessuna risorsa osservata o configurata';
      const info=document.createElement('p');
      info.textContent=catalog.live?'Stato confermato dal runtime C++ · aggiornamento recente':
        'Stato runtime non verificato ('+catalog.reason+'): vengono mostrati solo dati di configurazione';
      container.append(info);
      for(const item of catalog.resources){
        const div=document.createElement('div');
        div.textContent=item.name+' · '+(item.source==='cpp-lua-bridge'?('Lua: '+item.status):'configurata; stato runtime sconosciuto')+
          (item.dependencies.length?' · dipende da '+item.dependencies.join(', '):'');
        div.style.padding='6px 0';
        container.append(div);
      }
    }
  }catch {
    $('state').textContent='Non disponibile';$('state').className='value red';
    $('message').textContent='Impossibile leggere la diagnostica';
  }finally{busy=false;}
}
$('login-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const input=$('login-token');
  const token=input.value;
  input.value='';
  try{
    const response=await fetch('/api/login',{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    $('auth-message').textContent=response.ok?'Accesso verificato':'Accesso negato o limite di tentativi raggiunto';
    if(response.ok)await refresh();
  }catch {$('auth-message').textContent='Verificatore non disponibile';}
});
$('logout').addEventListener('click',async()=>{
  try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'});}catch{}
  showAuthorized(false);
  $('auth-message').textContent='Sessione terminata';
});
$('refresh').addEventListener('click',refresh);
showAuthorized(false);refresh();setInterval(refresh,5000);
