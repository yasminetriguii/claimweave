import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {validateState,programs,evaluate,makePacket} from './dist/engine.js';
const derive=promisify(scrypt), digest=v=>createHash('sha256').update(v).digest('hex');
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function createBackend({database='data/claimweave.sqlite',origin='http://127.0.0.1:4173',secure=false,now=()=>Date.now()}={}){
  if(database!==':memory:')mkdirSync(dirname(database),{recursive:true});
  const db=new DatabaseSync(database); db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS workspace_owner ON workspaces(user_id,updated_at);
    CREATE TABLE IF NOT EXISTS security_events(id INTEGER PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,event TEXT NOT NULL,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
  const q=sql=>db.prepare(sql), event=(id,name)=>q('INSERT INTO security_events(user_id,event,at) VALUES(?,?,?)').run(id,name,now());
  let hashing=0;
  async function hashPassword(password,salt){if(hashing>=4)throw fail(503,'Sign-in is busy. Try again shortly.');hashing++;try{return await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:67108864});}finally{hashing--;}}
  const cookie=(token,age=604800)=>`cw_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
  const token=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('cw_session='))?.slice(11)||'';
  function session(req){return q('SELECT s.*,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token(req)),now());}
  function requireUser(req){const s=session(req);if(!s)throw fail(401,'Sign in to continue.');return s;}
  function rate(bucket,limit=12){const t=now();q('DELETE FROM rate_limits WHERE expires_at<=?').run(t);const r=q('SELECT count FROM rate_limits WHERE bucket=?').get(bucket);if(r?.count>=limit)throw fail(429,'Too many attempts. Try again in 15 minutes.');q('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1').run(bucket,t+900000);}
  async function body(req){if(!(req.headers['content-type']||'').startsWith('application/json'))throw fail(415,'Use application/json.');let chunks=[],length=0;for await(const c of req){length+=c.length;if(length>262144)throw fail(413,'Request is too large.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'Invalid JSON.');}}
  function workspace(data){if(typeof data?.name!=='string'||!data.name.trim()||data.name.length>100)throw fail(400,'Use a workspace name of 1–100 characters.');try{validateState(data.state);}catch{throw fail(400,'Invalid evidence workspace.');}if(!/^\d{4}-\d{2}-\d{2}$/.test(data.asOf||'')||!Number.isFinite(Date.parse(data.asOf))||new Date(data.asOf).toISOString().slice(0,10)!==data.asOf)throw fail(400,'Invalid evaluation date.');const events=data.state.events||[];if(!Array.isArray(events)||events.length>1000||events.some(e=>!e||typeof e.action!=='string'||e.action.length>1000||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))))throw fail(400,'Invalid activity events.');return JSON.stringify({state:{schemaVersion:1,evidence:data.state.evidence,consents:data.state.consents,events},asOf:data.asOf});}
  function issue(res,id){const t=randomBytes(32).toString('base64url');q('DELETE FROM sessions WHERE expires_at<=?').run(now());q('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(t),id,now(),now()+604800000);res.setHeader('Set-Cookie',cookie(t));}
  async function handle(req,res){
    const url=new URL(req.url,origin),path=url.pathname;if(!path.startsWith('/api/'))return false;
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,value)=>{res.writeHead(status);res.end(JSON.stringify(value));};
    try{
      if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)throw fail(403,'Request origin rejected.');
      if(path==='/api/health'&&req.method==='GET'){send(200,{ok:true,version:'0.3.0',storage:'sqlite',accounts:true});return true;}
      if(path==='/api/session'&&req.method==='GET'){const s=session(req);send(200,{user:s?{id:s.user_id,username:s.username}:null,connections:[],connectionAvailability:'No external providers configured'});return true;}
      if(['/api/signup','/api/login'].includes(path)&&req.method==='POST'){
        rate('ip:'+req.socket.remoteAddress,30);const b=await body(req),username=typeof b.username==='string'?b.username.toLowerCase().trim():'';
        if(!/^[a-z0-9_]{3,32}$/.test(username)||typeof b.password!=='string'||b.password.length<12||b.password.length>128)throw fail(400,'Use a 3–32 character username (letters, numbers, underscore) and a 12–128 character password.');
        rate('user:'+digest(username));const u=q('SELECT * FROM users WHERE username=?').get(username);
        const salt=u?.salt||randomBytes(16).toString('hex');const hash=await hashPassword(b.password,salt);
        if(path==='/api/signup'){
          if(u)throw fail(409,'This username is unavailable.');const id=randomUUID();try{q('INSERT INTO users VALUES(?,?,?,?,?)').run(id,username,salt,hash.toString('hex'),now());}catch(e){if(e.code?.startsWith('ERR_SQLITE'))throw fail(409,'This username is unavailable.');throw e;}issue(res,id);event(id,'account_created');send(201,{user:{id,username}});
        }else{if(!u||!timingSafeEqual(hash,Buffer.from(u.password_hash,'hex')))throw fail(401,'Incorrect username or password.');issue(res,u.id);event(u.id,'signed_in');send(200,{user:{id:u.id,username}});}return true;
      }
      const s=requireUser(req),id=s.user_id;
      if(path==='/api/logout'&&req.method==='POST'){q('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash);res.setHeader('Set-Cookie',cookie('',0));event(id,'signed_out');send(200,{ok:true});return true;}
      if(path==='/api/sessions/revoke'&&req.method==='POST'){q('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(id,s.token_hash);event(id,'other_sessions_revoked');send(200,{ok:true});return true;}
      if(path==='/api/security'&&req.method==='GET'){send(200,{events:q('SELECT event,at FROM security_events WHERE user_id=? ORDER BY id DESC LIMIT 50').all(id),sessions:q('SELECT created_at,expires_at,token_hash=? AS current FROM sessions WHERE user_id=? AND expires_at>?').all(s.token_hash,id,now())});return true;}
      if(path==='/api/workspaces'&&req.method==='GET'){send(200,{workspaces:q('SELECT id,name,revision,updated_at FROM workspaces WHERE user_id=? ORDER BY updated_at DESC').all(id)});return true;}
      if(path==='/api/workspaces'&&req.method==='POST'){const b=await body(req),payload=workspace(b);if(q('SELECT COUNT(*) AS n FROM workspaces WHERE user_id=?').get(id).n>=100)throw fail(409,'Workspace limit reached (100).');const wid=randomUUID();q('INSERT INTO workspaces VALUES(?,?,?,?,1,?)').run(wid,id,b.name.trim(),payload,now());event(id,'workspace_created');send(201,{id:wid,revision:1});return true;}
      const m=path.match(/^\/api\/workspaces\/([a-f0-9-]{36})$/);
      const evaluation=path.match(/^\/api\/workspaces\/([a-f0-9-]{36})\/(evaluate|packet)$/);
      if(evaluation&&req.method==='POST'){const w=q('SELECT * FROM workspaces WHERE id=? AND user_id=?').get(evaluation[1],id);if(!w)throw fail(404,'Workspace not found.');const b=await body(req);if(b.revision!==w.revision)throw fail(409,'Workspace revision changed. Reopen it first.');const saved=JSON.parse(w.payload);if(evaluation[2]==='evaluate'){send(200,{revision:w.revision,results:programs.map(p=>evaluate(saved.state,p,saved.asOf))});}else{const program=programs.find(p=>p.id===b.programId);if(!program)throw fail(400,'Unknown program.');let packet;try{packet=makePacket(saved.state,program,saved.asOf);}catch{throw fail(409,'Packet blocked: current consent and satisfied checks are required.');}event(id,'packet_generated');send(200,{revision:w.revision,packet});}return true;}
      if(m){const w=q('SELECT * FROM workspaces WHERE id=? AND user_id=?').get(m[1],id);if(!w)throw fail(404,'Workspace not found.');
        if(req.method==='GET'){send(200,{id:w.id,name:w.name,revision:w.revision,...JSON.parse(w.payload)});return true;}
        if(req.method==='PUT'){const b=await body(req),payload=workspace(b);const result=q('UPDATE workspaces SET name=?,payload=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=?').run(b.name.trim(),payload,now(),w.id,id,b.revision??-1);if(!result.changes)throw fail(409,'A newer save exists. Reopen the workspace before updating.');event(id,'workspace_updated');send(200,{id:w.id,revision:w.revision+1});return true;}
        if(req.method==='DELETE'){q('DELETE FROM workspaces WHERE id=? AND user_id=?').run(w.id,id);event(id,'workspace_deleted');send(200,{ok:true});return true;}
      }
      send(404,{error:'Endpoint not found.'});
    }catch(e){send(e.status||500,{error:e.status?e.message:'Server could not complete this request.'});}
    return true;
  }
  return {handle,close:()=>db.close()};
}
