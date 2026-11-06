'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createStatusMonitor}=require('../core/status');
const {createJavaVerifier}=require('./java-verifier');
const {createResourceCatalog}=require('../core/resource-catalog');
const {createRuntimeStatusReader}=require('../core/runtime-status');
const {createIpcRuntimeReader}=require('../core/ipc-runtime-reader');

const page=fs.readFileSync(path.join(__dirname,'public','index.html'));
const script=fs.readFileSync(path.join(__dirname,'public','app.js'));
const headers={
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
};
const loopback=address=>address==='127.0.0.1'||address==='::1'||address==='::ffff:127.0.0.1';
function makeDashboard({monitor=createStatusMonitor(),targetPort=3000,verify=createJavaVerifier(),catalog=createResourceCatalog(),runtimeReader=process.env.LIFE_TELEMETRY_IPC_PATH?createIpcRuntimeReader():createRuntimeStatusReader(),now=Date.now}={}) {
  if(!Number.isInteger(targetPort)||targetPort<1||targetPort>65535)throw new RangeError('Invalid game port');
  const sessions=new Map();
  let attempts=[];
  const reply=(res,code,data,extra={})=>{
    res.writeHead(code,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});
    res.end(JSON.stringify(data));
  };
  const originOK=(req)=>{
    const host=String(req.headers.host||'');
    const origin=String(req.headers.origin||'');
    return origin==='http://'+host;
  };
  const readBody=(req,max=256)=>new Promise((resolve,reject)=>{
    let body='';
    req.on('data',b=>{
      body+=b.toString('utf8');
      if(Buffer.byteLength(body)>max){reject(Error('too large'));req.destroy();}
    });
    req.on('end',()=>resolve(body));req.on('error',reject);
  });
  return http.createServer(async(req,res)=>{
    const host=String(req.headers.host||'');
    if(!loopback(req.socket.remoteAddress) || !/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(host)){
      res.writeHead(403,headers);res.end('Forbidden');return;
    }
    // Avoid accumulating expired sessions indefinitely.
    for(const [sid,item] of sessions) if(item.expires<=now())sessions.delete(sid);
    const pathname=(req.url||'').split('?')[0];
    if(req.method==='GET'&&pathname==='/'){
      res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(page);return;
    }
    if(req.method==='GET'&&pathname==='/app.js'){
      res.writeHead(200,{...headers,'Content-Type':'application/javascript; charset=utf-8'});res.end(script);return;
    }
    if(req.method==='POST'&&pathname==='/api/login'){
      if(!originOK(req)){reply(res,403,{error:'Invalid origin'});return;}
      attempts=attempts.filter(at=>now()-at<60000);
      if(attempts.length>=5){reply(res,429,{error:'Too many login attempts'});return;}
      attempts.push(now());
      try {
        const body=JSON.parse(await readBody(req));
        const token=body&&body.token;
        if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token) || !(await verify(token))){
          reply(res,401,{error:'Access denied'});return;
        }
        const sessionId=crypto.randomBytes(32).toString('hex');
        sessions.set(sessionId,{token,expires:now()+5*60*1000});
        reply(res,200,{authorized:true},{'Set-Cookie':'lifeadmin='+sessionId+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=300'});
      }catch {reply(res,400,{error:'Invalid login request'});}
      return;
    }
    const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)lifeadmin=([a-f0-9]{64})(?=;|$)/);
    const key=cookie&&cookie[1];
    const session=key&&sessions.get(key);
    if(req.method==='POST'&&pathname==='/api/logout'){
      if(!originOK(req)){reply(res,403,{error:'Invalid origin'});return;}
      if(key)sessions.delete(key);
      reply(res,200,{authorized:false},{'Set-Cookie':'lifeadmin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
      return;
    }
    if(req.method==='GET'&&(pathname==='/api/status'||pathname==='/api/resources')){
      if(!session||session.expires<=now()){
        if(key)sessions.delete(key);
        reply(res,401,{error:'Authentication required'});return;
      }
      try {
        // Permissions and token expiry are rechecked on every protected request.
        if(!(await verify(session.token))){sessions.delete(key);reply(res,403,{error:'Access revoked'});return;}
        if(pathname==='/api/resources'){
          const observed=await runtimeReader.read(catalog.list());
          reply(res,200,{mode:observed.live?'runtime-observed':'catalog-only',...observed});
        }else{
          const game=await monitor.status(targetPort);
          reply(res,200,{dashboard:'LifeAdmin v0.5',mode:'authenticated-local-read-only',checkedAt:new Date().toISOString(),game,
            adminProcess:{uptimeSeconds:Math.floor(process.uptime()),memoryRssMiB:Math.round(process.memoryUsage().rss/1048576)}});
        }
      }catch{reply(res,503,{error:'Status temporarily unavailable'});}
      return;
    }
    if(pathname.startsWith('/api/')){
      reply(res,req.method==='GET'?404:405,{error:'Not available'});return;
    }
    res.writeHead(404,headers);res.end('Not found');
  });
}
function startDashboard(env=process.env) {
  const port=Number(env.LIFE_ADMIN_PORT||4101);
  const targetPort=Number(env.LIFE_ADMIN_TARGET_PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('Invalid admin port');
  const runtimeReader=env.LIFE_TELEMETRY_IPC_PATH?
    createIpcRuntimeReader({socketPath:env.LIFE_TELEMETRY_IPC_PATH,key:env.LIFE_TELEMETRY_HMAC_KEY}):
    createRuntimeStatusReader({file:env.LIFE_RESOURCE_STATUS_FILE,hmacKey:env.LIFE_TELEMETRY_HMAC_KEY});
  const server=makeDashboard({targetPort,verify:createJavaVerifier({env}),runtimeReader});
  server.listen(port,'127.0.0.1',()=>console.log('LifeAdmin LOCAL session-gated: http://127.0.0.1:'+port));
  return server;
}
if(require.main===module)startDashboard();
module.exports={makeDashboard,startDashboard};
