'use strict';
const net=require('node:net');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {validKey,sign,verify}=require('./telemetryAuth');

// Read-only authenticated IPC for trusted processes on the SAME PC.
// Unix-domain socket only. No public TCP listeners, arbitrary commands or eval.
const validSocket=p=>process.platform!=='win32'&&typeof p==='string'&&path.isAbsolute(p);
const requestMac=(nonce,key)=>crypto.createHmac('sha256',Buffer.from(key,'hex'))
 .update('lifeadmin:read:'+nonce).digest('hex');
const safeEquals=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&
 crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));

function createTelemetryIpcServer({socketPath,key,getSnapshot}={}) {
 if(!validSocket(socketPath)||!validKey(key)||typeof getSnapshot!=='function')
  throw new Error('Local IPC requires absolute Unix socket path and HMAC key');
 const server=net.createServer(socket=>{
  socket.setTimeout(2000,()=>socket.destroy());
  let buffer='',done=false;
  socket.on('data',chunk=>{
   if(done)return;
   buffer+=String(chunk);
   if(Buffer.byteLength(buffer)>512){done=true;socket.destroy();return;}
   const index=buffer.indexOf('\n');
   if(index<0)return;
   done=true;
   try {
    const req=JSON.parse(buffer.slice(0,index));
    if(!req||typeof req.nonce!=='string'||!/^[a-f0-9]{32}$/.test(req.nonce)||
       !safeEquals(req.mac,requestMac(req.nonce,key))) {
      socket.end('DENY\n');return;
    }
    const snapshot=getSnapshot();
    if(!snapshot||typeof snapshot!=='object')throw Error('snapshot unavailable');
    const response=JSON.stringify({nonce:req.nonce,snapshot:sign(snapshot,key)});
    if(Buffer.byteLength(response)>32768)throw Error('too large');
    socket.end(response+'\n');
   }catch{socket.end('DENY\n');}
  });
  socket.on('error',()=>{});
 });
 server.maxConnections=8;
 let boundInode=null;
 return {
  server,
  listen(){
   return new Promise((resolve,reject)=>{
    try {
     const directory=fs.statSync(path.dirname(socketPath));
     if(!directory.isDirectory()||(directory.mode&0o077)!==0||
        (typeof process.getuid==='function'&&directory.uid!==process.getuid()))
       throw Error('IPC directory must be owned by operator and mode 0700');
     if(Buffer.byteLength(socketPath)>100)throw Error('IPC socket path too long');
     if(fs.existsSync(socketPath))throw Error('IPC socket already exists');
    }catch(error){reject(error);return;}
    const failure=error=>{server.removeListener('listening',ready);reject(error);};
    const ready=()=>{
     server.removeListener('error',failure);
     try{
      fs.chmodSync(socketPath,0o600);
      boundInode=fs.statSync(socketPath).ino;
      resolve(server);
     }
     catch(error){server.close();reject(error);}
    };
    server.once('error',failure);
    server.once('listening',ready);
    // Intentionally refuse to unlink an existing socket on startup.
    server.listen(socketPath);
   });
  },
  close(){
   return new Promise(resolve=>{
    if(!server.listening){resolve();return;}
    server.close(()=>{
     // This socket was created by this process; best-effort cleanup.
     try{
      if(boundInode!==null&&fs.statSync(socketPath).ino===boundInode)
       fs.unlinkSync(socketPath);
     }catch{}
     resolve();
    });
   });
  }
 };
}

function fetchTelemetryIpc({socketPath,key,timeoutMs=1500}={}) {
 if(!validSocket(socketPath)||!validKey(key)||!Number.isInteger(timeoutMs)||
    timeoutMs<100||timeoutMs>5000)
  return Promise.reject(Error('Invalid IPC configuration'));
 const nonce=crypto.randomBytes(16).toString('hex');
 return new Promise((resolve,reject)=>{
  const socket=net.createConnection(socketPath);
  let done=false,buffer='';
  const finish=(err,data)=>{
   if(done)return;
   done=true;
   socket.destroy();
   if(err)reject(err);else resolve(data);
  };
  socket.setTimeout(timeoutMs,()=>finish(Error('IPC timeout')));
  socket.on('error',err=>finish(err));
  socket.on('connect',()=>socket.write(JSON.stringify({nonce,mac:requestMac(nonce,key)})+'\n'));
  socket.on('data',chunk=>{
   buffer+=String(chunk);
   if(Buffer.byteLength(buffer)>32768){finish(Error('IPC response too large'));return;}
   const end=buffer.indexOf('\n');
   if(end<0)return;
   try{
    const response=JSON.parse(buffer.slice(0,end));
    if(response.nonce!==nonce||!verify(response.snapshot,key))throw Error('IPC authentication failed');
    finish(null,response.snapshot);
   }catch{finish(Error('Invalid IPC response'));}
  });
  socket.on('end',()=>finish(Error('Incomplete IPC response')));
 });
}
module.exports={createTelemetryIpcServer,fetchTelemetryIpc};
