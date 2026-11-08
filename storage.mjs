import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export async function openStorage({database,databaseUrl}){
  if(!databaseUrl){
    if(database!==':memory:')mkdirSync(dirname(database),{recursive:true});
    const db=new DatabaseSync(database);
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    return {kind:'sqlite',prepare:sql=>db.prepare(sql),exec:sql=>db.exec(sql),close:()=>db.close(),ping:()=>db.prepare('SELECT 1').get()};
  }
  const {default:pg}=await import('pg');
  pg.types.setTypeParser(20,value=>{const n=Number(value);if(!Number.isSafeInteger(n))throw Error('Database integer exceeds supported range');return n;});
  const pool=new pg.Pool({connectionString:databaseUrl,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,statement_timeout:10000});
  pool.on('error',()=>console.error('Database connection interrupted.'));
  const query=(sql,args=[])=>{let i=0;return pool.query(sql.replace(/\?/g,()=>'$'+(++i)),args);};
  return {kind:'postgres',prepare:sql=>({get:async(...args)=>(await query(sql,args)).rows[0],all:async(...args)=>(await query(sql,args)).rows,run:async(...args)=>({changes:(await query(sql,args)).rowCount})}),exec:async sql=>{await pool.query(sql.replace('id INTEGER PRIMARY KEY','id BIGSERIAL PRIMARY KEY').replace(/(created_at|expires_at|updated_at|\bat) INTEGER/g,'$1 BIGINT'));},close:()=>pool.end(),ping:()=>pool.query('SELECT 1')};
}
