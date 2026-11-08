import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  const allowed=new Set(['/','/index.html','/styles.css','/app.js','/engine.js']);
  if(!allowed.has(path)){res.writeHead(404);res.end('Not found');return;}
  try{const body=await readFile(join(root,path==='/'?'index.html':path.slice(1)));res.writeHead(200,{'Content-Type':types[extname(path==='/'?'index.html':path)],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);}catch{res.writeHead(500);res.end('Unable to load asset');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('ClaimWeave local preview: http://127.0.0.1:'+server.address().port));
