'use strict';
const {spawn}=require('node:child_process');

// Only an operator-configured Java service may resolve sessions.
// No mock authorization in production; missing configuration denies every request.
function createJavaVerifier({
  command=process.env.LIFE_ADMIN_JAVA_BIN||'java',
  classpath=process.env.LIFE_ADMIN_JAVA_CLASSPATH,
  env=process.env,spawnProcess=spawn,timeoutMs=3000,maxConcurrent=2
}={}) {
  if(!classpath || !env.LIFE_ADMIN_COMMUNITY_ID || !env.LIFE_JDBC_URL ||
     !env.LIFE_JDBC_USER || !env.LIFE_JDBC_PASSWORD) return async()=>false;
  let active=0;
  return function verify(token) {
    if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return Promise.resolve(false);
    if(active>=maxConcurrent)return Promise.resolve(false);
    active++;
    return new Promise(resolve=>{
      let finished=false,output='',child,timer;
      const done=value=>{
        if(finished)return;
        finished=true;
        clearTimeout(timer);
        active--;
        resolve(value);
      };
      try {
        child=spawnProcess(command,['-cp',classpath,'rp.core.AdminSessionVerifier'],{
          shell:false,stdio:['pipe','pipe','ignore'],windowsHide:true,
          env:{...env,LIFE_ADMIN_SESSION_TOKEN:undefined}
        });
        timer=setTimeout(()=>{
          try{child.kill('SIGKILL');}catch{}
          done(false);
        },timeoutMs);
        child.on('error',()=>done(false));
        child.stdout.on('data',part=>{
          output+=String(part);
          if(output.length>64) {
            try{child.kill('SIGKILL');}catch{}
            done(false);
          }
        });
        child.on('close',code=>done(code===0&&output.trim()==='ALLOW'));
        child.stdin.on('error',()=>done(false));
        child.stdin.end(token+'\n');
      } catch {
        try{child?.kill('SIGKILL');}catch{}
        done(false);
      }
    });
  };
}
module.exports={createJavaVerifier};
