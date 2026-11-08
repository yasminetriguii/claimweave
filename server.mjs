import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
import {createBackend} from './backend.mjs';
const port=Number(process.env.PORT||4173);
const production=process.env.NODE_ENV==='production';
if(production&&!process.env.APP_ORIGIN&&!process.env.RENDER_EXTERNAL_URL)throw Error('APP_ORIGIN is required in production.');
const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||`http://127.0.0.1:${port}`;
if(production&&!origin.startsWith('https://'))throw Error('Production APP_ORIGIN must use HTTPS.');
const backend=await createBackend({database:process.env.DATABASE_PATH||'data/claimweave.sqlite',origin,secure:production});
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  if(await backend.handle(req,res))return;
  const path=new URL(req.url,'http://localhost').pathname;
  const allowed=new Set(['/','/index.html','/styles.css','/app.js','/engine.js','/lab.js','/accounts.js']);
  if(!allowed.has(path)){res.writeHead(404);res.end('Not found');return;}
  try{const body=await readFile(join(root,path==='/'?'index.html':path.slice(1)));res.writeHead(200,{'Content-Type':types[extname(path==='/'?'index.html':path)],'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(body);}catch{res.writeHead(500);res.end('Unable to load asset');}
});
server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=40;
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('ClaimWeave server: '+origin));
function stop(){server.close(async()=>{await backend.close();process.exit(0);});}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
