// Real HTTP smoke check, run by CI (local sandbox may block loopback sockets).
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {seed} from '../dist/engine.js';
const directory=await mkdtemp(join(tmpdir(),'claimweave-smoke-'));
const port='18473',origin='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'test',PORT:port,APP_ORIGIN:origin,DATABASE_PATH:join(directory,'test.sqlite')},stdio:['ignore','pipe','inherit']});
const api=async(path,{method='GET',data,cookie}={})=>{const r=await fetch(origin+'/api/'+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out')),10000);child.once('error',e=>{clearTimeout(timer);reject(e);});child.stdout.on('data',b=>{if(b.toString().includes('ClaimWeave server:')){clearTimeout(timer);resolve();}});});
  assert.equal((await api('health')).status,200);
  const page=await fetch(origin);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);
  const a=await api('signup',{method:'POST',data:{username:'smoke_user',password:'smoke-password-12345!'}});assert.equal(a.status,201);
  const w=await api('workspaces',{method:'POST',cookie:a.cookie,data:{name:'Smoke fixture',state:seed(),asOf:'2026-11-08'}});assert.equal(w.status,201);
  assert.equal((await api('workspaces/'+w.body.id,{cookie:a.cookie})).body.name,'Smoke fixture');
  const packet=await api('workspaces/'+w.body.id+'/packet',{method:'POST',cookie:a.cookie,data:{revision:1,programId:'housing'}});assert.equal(packet.status,200);
  await api('logout',{method:'POST',cookie:a.cookie,data:{}});assert.equal((await api('workspaces',{cookie:a.cookie})).status,401);
  console.log('HTTP smoke passed: assets, signup, cookie session, durable save, packet, logout.');
}finally{child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));await rm(directory,{recursive:true,force:true});}
