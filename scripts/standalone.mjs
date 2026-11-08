import {readFile,writeFile} from 'node:fs/promises';
let html=await readFile('dist/index.html','utf8');
const css=await readFile('dist/styles.css','utf8');
const engine=(await readFile('dist/engine.js','utf8')).replace(/^export /gm,'');
const app=(await readFile('dist/app.js','utf8')).replace(/^import .*\n/,'').replace(/^import\('\.\/(lab|accounts).js'\).*$/gm,'');
const lab=(await readFile('dist/lab.js','utf8')).replace(/^import .*\n/,'').replace(/^export /gm,'');
const combined=`${engine}\n${lab}\n${app}\nmount(()=>({state:structuredClone(state),asOf}),log);`;
new Function(combined); // Parse the exact standalone payload before writing it.
html=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>','').replace('</body>',()=>`<script>${combined}</script></body>`);
await writeFile('ClaimWeave-Demo.html',html);
console.log('Created portable ClaimWeave-Demo.html; open directly in a browser.');
