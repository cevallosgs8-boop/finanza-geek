import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
const allowed=['index.html','manifest.json','sw.js','tests.html'];
function permitted(rel){return allowed.includes(rel)||rel.startsWith('src/')||rel.startsWith('tests/');}
const portArg=process.argv.indexOf('--port');const port=portArg>=0?Number(process.argv[portArg+1]):8000;if(!Number.isInteger(port)||port<1||port>65535){console.error('Puerto inválido. Usa --port 8000.');process.exit(2);}
const server=http.createServer(async(req,res)=>{if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return;}try{let pathname=new URL(req.url||'/', 'http://127.0.0.1').pathname;let decoded=decodeURIComponent(pathname);if(decoded==='/'||decoded==='/')decoded='/index.html';const rel=decoded.replace(/^\/+/, '').replaceAll('\\','/');if(rel.split('/').some(part=>part==='..'||part.startsWith('.'))||!permitted(rel)){res.writeHead(404,{'Cache-Control':'no-store'});res.end('No encontrado');return;}const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(404);res.end('No encontrado');return;}const info=await stat(file);if(!info.isFile())throw new Error('not file');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404,{'Cache-Control':'no-store'});res.end('No encontrado');}});
server.listen(port,'127.0.0.1',()=>console.log('Finanza Geek en http://127.0.0.1:'+port));
