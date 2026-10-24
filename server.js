// Optional Node.js server: serves these static files and forwards public booking
// requests to the existing Girudo server, which already has the Telegram bot.
// No Telegram token belongs in index.html or script.js.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const upstream = 'https://hirudo-care.bziksievmuhamed.chatgpt.site';
const files = {'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/styles.css':['styles.css','text/css; charset=utf-8'],'/script.js':['script.js','text/javascript; charset=utf-8'],'/botanical.svg':['botanical.svg','image/svg+xml']};
createServer(async (req,res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    const api = (path === '/api/slots' && req.method === 'GET') || (path === '/api/bookings' && req.method === 'POST');
    if (api) {
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (!origin || new URL(origin).host !== req.headers.host) {res.writeHead(403);res.end();return;}
      }
      let body = '';
      for await (const chunk of req) {body += chunk;if (Buffer.byteLength(body) > 4096) {res.writeHead(413);res.end();return;}}
      const response = await fetch(upstream + path, {method:req.method,headers:{'Origin':upstream,'Content-Type':'application/json'},...(req.method === 'POST' ? {body} : {}),signal:AbortSignal.timeout(30000)});
      res.writeHead(response.status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(await response.text());return;
    }
    if (req.method !== 'GET' || !files[path]) {res.writeHead(404);res.end('Not found');return;}
    const [name,type] = files[path];const bytes = await readFile(fileURLToPath(new URL(name,import.meta.url)));
    res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});res.end(bytes);
  } catch {res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:'Сервис временно недоступен. Попробуйте позже.'}));}
}).listen(Number(process.env.PORT || 3000),'0.0.0.0',() => console.log('Girudo server is ready'));
