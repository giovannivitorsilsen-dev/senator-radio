const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const net=require('node:net');
const WebSocket=require('ws');

function freePort(){return new Promise((resolve,reject)=>{
 const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{
 const p=socket.address().port;socket.close(()=>resolve(p));});socket.on('error',reject);
});}
function until(ws,pred,timeout=3000){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.off('message',handle);reject(new Error('Message timeout'));},timeout);
 function handle(buf){let m;try{m=JSON.parse(String(buf));}catch{return;}if(pred(m)){clearTimeout(timer);ws.off('message',handle);resolve(m);}}
 ws.on('message',handle);
});}
function connect(url){return new Promise((resolve,reject)=>{
 const ws=new WebSocket(url);ws.once('open',()=>resolve(ws));ws.once('error',reject);
});}
test('Linux/Windows browser multiplayer smoke', {timeout:12000},async()=>{
 const port=await freePort();
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
 const sockets=[];
 try{
  let ready=false;
  for(let i=0;i<60;i++){
   if(child.exitCode!==null)throw Error('Server crashed');
   try{await new Promise((resolve,reject)=>http.get('http://127.0.0.1:'+port+'/',res=>{res.resume();res.statusCode===200?resolve():reject(Error('HTTP '+res.statusCode));}).on('error',reject));ready=true;break;}
   catch{await new Promise(r=>setTimeout(r,80));}
  }
  assert.equal(ready,true,'server should answer HTTP 200');
  const html=await new Promise((resolve,reject)=>http.get('http://127.0.0.1:'+port+'/',res=>{
   let content='';res.setEncoding('utf8');res.on('data',chunk=>content+=chunk);
   res.on('end',()=>resolve(content));
  }).on('error',reject));
  assert.match(html,/Alpha 1\.2 Preview/);
  assert.match(html,/id="mini"/);
  assert.match(html,/id="count"/);
  assert.match(html,/Ospedale/);
  const a=await connect('ws://127.0.0.1:'+port);
  const b=await connect('ws://127.0.0.1:'+port);
  sockets.push(a,b);
  // The initial welcome may arrive immediately after the socket opens.
  // New connections must also appear with finite server-owned coordinates.
  const sawTwo=until(a,m=>m.type==='players'&&m.players.length===2);
  const snapshot=await sawTwo;
  assert.equal(snapshot.players.length,2);
  assert.equal(snapshot.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)),true);
  const chat=until(b,m=>m.type==='chat'&&m.message==='ciao');
  a.send(JSON.stringify({type:'chat',message:'ciao'}));
  assert.equal((await chat).message,'ciao');
 }finally{
  for(const ws of sockets)ws.terminate();
  child.kill('SIGTERM');
 }
});
