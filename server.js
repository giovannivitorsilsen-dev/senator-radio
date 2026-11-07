const http=require('http');
const fs=require('fs');
const path=require('path');
const {createLuaBridge}=require('./bridge/luaBridge');
const {createTelemetryIpcServer}=require('./bridge/localTelemetryIpc');
const {WebSocketServer,WebSocket}=require('ws');
const {loadServerConfig}=require('./config/serverConfig');
const serverConfig=loadServerConfig();
const RP_POINTS=Object.freeze({fountain:{x:20,z:20,label:'Fontana della piazza',message:'La fontana è accesa. Questo è un punto d’incontro della community.'},hospital:{x:68,z:-54,label:'Ospedale',message:'L’ospedale è ancora dimostrativo. Servizi medici in sviluppo.'},park:{x:-50,z:-50,label:'Parco cittadino',message:'Una zona tranquilla per incontrare altri giocatori.'}});
const port=Number(process.env.PORT||3000);
const clients=new Map();
let nextId=1;
// Explicit opt-in. Only the trusted server selects the native binary and script.
const luaBridge=createLuaBridge({
  enabled:process.env.LIFE_LUA_BRIDGE==='1',
  binary:process.env.LIFE_LUA_BRIDGE_BIN,
  script:process.env.LIFE_LUA_SCRIPT,
  statusFile:process.env.LIFE_RESOURCE_STATUS_FILE,
  hmacKey:process.env.LIFE_TELEMETRY_HMAC_KEY,
  auditFile:process.env.LIFE_SUPERVISOR_AUDIT_FILE,
  extraResources:JSON.parse(process.env.LIFE_LUA_EXTRA_RESOURCES||'[]')
});
process.on('exit',()=>luaBridge.close());
// Optional Unix-socket telemetry for the trusted desktop admin process.
// Never expose this as a game WebSocket/HTTP route.
if(process.env.LIFE_TELEMETRY_IPC_PATH){
  if(process.env.LIFE_LUA_BRIDGE!=='1')throw Error('IPC requires enabled Lua bridge');
  const ipc=createTelemetryIpcServer({
    socketPath:process.env.LIFE_TELEMETRY_IPC_PATH,
    key:process.env.LIFE_TELEMETRY_HMAC_KEY,
    getSnapshot:()=>luaBridge.snapshot()
  });
  ipc.listen().catch(()=>{
    console.error('LifeTelemetry IPC unavailable; check private socket path and permissions');
    process.exitCode=1;
    server.close();
  });
  process.on('SIGTERM',()=>{ipc.close().finally(()=>process.exit(0));});
}
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname!=='/'&&pathname!=='/index.html'){res.writeHead(404);return res.end('Not found');}
  fs.readFile(path.join(__dirname,'public','index.html'),(e,data)=>{
    if(e){res.writeHead(500);return res.end('Error');}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(data);
  });
});
const wss=new WebSocketServer({server,maxPayload:4096});
const clean=s=>String(s||'Giocatore').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,22)||'Giocatore';
const broadcast=(data)=>{const text=JSON.stringify(data);for(const ws of clients.keys()) if(ws.readyState===WebSocket.OPEN)ws.send(text);};
wss.on('connection',(ws)=>{
  if(clients.size>=serverConfig.maxPlayers){ws.close(1013,'Server full');return;}
  const id=nextId++;
  const p={id,name:'Giocatore '+id,x:Math.random()*12-6,z:Math.random()*12-6,dir:0};
  clients.set(ws,p);
  ws.send(JSON.stringify({type:'welcome',id,x:p.x,z:p.z,serverName:serverConfig.serverName,maxPlayers:serverConfig.maxPlayers,motd:serverConfig.motd}));
  ws.on('message',buf=>{
    let m;try{m=JSON.parse(buf.toString());}catch{return;}
    if(!m||typeof m!=='object')return;
    if(m.type==='join'){
      p.name=clean(m.name);
      // One limited greeting event per connection; never forward arbitrary commands.
      if(!p.luaGreeted){p.luaGreeted=true;luaBridge.hello(p.name);}
      return;
    }
    if(m.type==='move'){
      const x=Number(m.x),z=Number(m.z),dir=Number(m.dir);
      if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(dir))return;
      const now=Date.now();if(now-(p.lastMove||0)<35)return;p.lastMove=now;
      const dt=Math.max(.035,Math.min(.4,(now-(p.lastAccepted||now))/1000));
      const maxStep=7*dt+0.3;
      if(Math.hypot(x-p.x,z-p.z)>maxStep)return;
      if(Math.abs(x)>180||Math.abs(z)>180)return;
      p.x=x;p.z=z;p.dir=dir;p.lastAccepted=now;
    }
    if(m.type==='interact'){
      const point=typeof m.point==='string'?RP_POINTS[m.point]:null;
      if(!point)return;
      const now=Date.now();
      if(now-(p.lastInteraction||0)<1000)return;
      if(Math.hypot(p.x-point.x,p.z-point.z)>8)return;
      p.lastInteraction=now;
      ws.send(JSON.stringify({type:'interaction',point:m.point,label:point.label,message:point.message}));
      return;
    }
    if(m.type==='chat'){
      const msg=String(m.message||'').trim().slice(0,160).replace(/[<>]/g,'');
      if(!msg)return;
      if(Date.now()-(p.lastChat||0)<1000)return;
      p.lastChat=Date.now();
      broadcast({type:'chat',name:p.name,message:msg});
    }
  });
  ws.on('close',()=>clients.delete(ws));
});
setInterval(()=>broadcast({type:'players',players:[...clients.values()].map(({id,name,x,z,dir})=>({id,name,x,z,dir}))}),120);
server.listen(port,'0.0.0.0',()=>console.log('PROJECT LIFE RP '+serverConfig.serverName+' ready on port '+port+' (max '+serverConfig.maxPlayers+' players)'));
