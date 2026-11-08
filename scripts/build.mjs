import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {seed} from '../dist/engine.js';
for(const f of ['dist/engine.js','dist/app.js','dist/lab.js','dist/accounts.js','backend.mjs','server.mjs'])execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
const html=await readFile('dist/index.html','utf8');
for(const asset of ['styles.css','app.js']){if(!html.includes(asset))throw Error('Missing asset reference: '+asset);await readFile('dist/'+asset);}
await writeFile('docs/demo-fixture.json',JSON.stringify(seed(),null,2)+'\n');
console.log('Build verified: dependency-free static application in dist/.');
