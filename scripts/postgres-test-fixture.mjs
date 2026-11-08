import {randomUUID} from 'node:crypto';
export async function postgresFixture(t){
  if(!process.env.TEST_DATABASE_URL)return '';
  const url=new URL(process.env.TEST_DATABASE_URL);
  if(url.pathname!=='/claimweave_test')throw Error('TEST_DATABASE_URL must name the disposable claimweave_test database');
  const {default:pg}=await import('pg');const admin=new pg.Pool({connectionString:url.href,max:1});
  const schema='cw_test_'+randomUUID().replaceAll('-','');
  await admin.query(`CREATE SCHEMA ${schema}`);
  t.after(async()=>{await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();});
  url.searchParams.set('options','-c search_path='+schema);return url.href;
}
