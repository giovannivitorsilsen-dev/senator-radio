'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createStatusMonitor}=require('../core/status');

const page=fs.readFileSync(path.join(__dirname,'public','index.html'));
const script=fs.readFileSync(path.join(__dirname,'public','app.js'));
const headers={
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};
const loopback=address=>address==='127.0.0.1'||address==='::1'||address==='::ffff:127.0.0.1';
function makeDashboard({monitor=createStatusMonitor(),targetPort=3000}={}) {
  if(!Number.isInteger(targetPort)||targetPort<1||targetPort>65535)throw new RangeError('Invalid game port');
  return http.createServer(async(req,res)=>{
    const host=String(req.headers.host||'');
    if(!loopback(req.socket.remoteAddress) || !/^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(host)){
      res.writeHead(403,headers);res.end('Forbidden');return;
    }
    if(req.method!=='GET'){
      res.writeHead(405,{...headers,Allow:'GET'});res.end('Method not allowed');return;
    }
    const route=(req.url||'').split('?')[0];
    if(route==='/'){
      res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});
      res.end(page);return;
    }
    if(route==='/app.js'){
      res.writeHead(200,{...headers,'Content-Type':'application/javascript; charset=utf-8'});
      res.end(script);return;
    }
    if(route==='/api/status'){
      try {
        const game=await monitor.status(targetPort);
        const result={dashboard:'LifeAdmin v0.2',mode:'local-read-only',checkedAt:new Date().toISOString(),game};
        res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(503,{...headers,'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify({error:'Status temporarily unavailable'}));
      }
      return;
    }
    res.writeHead(404,headers);res.end('Not found');
  });
}
function startDashboard(env=process.env) {
  const port=Number(env.LIFE_ADMIN_PORT||4101);
  const targetPort=Number(env.LIFE_ADMIN_TARGET_PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new RangeError('Invalid admin port');
  const server=makeDashboard({targetPort});
  server.listen(port,'127.0.0.1',()=>console.log('LifeAdmin LOCAL read-only: http://127.0.0.1:'+port));
  return server;
}
if(require.main===module)startDashboard();
module.exports={makeDashboard,startDashboard};
