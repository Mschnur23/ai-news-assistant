import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import news from '../api/news.js';
import scrape from '../api/scrape.js';

const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] };
createServer(async (req, res) => {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (value) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/news') return await news(req, res);
    if (path === '/api/scrape') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) return res.status(413).json({ error: 'Request is too large.' });
      }
      req.body = body;
      return await scrape(req, res);
    }
    const file = files[path];
    if (!file || !['GET', 'HEAD'].includes(req.method)) return res.status(404).end('Not found');
    res.setHeader('Content-Type', `${file[1]}; charset=utf-8`);
    res.end(req.method === 'HEAD' ? undefined : await readFile(file[0]));
  } catch { res.status(500).json({ error: 'Request failed. Please try again.' }); }
}).listen(3000, '127.0.0.1', () => console.log('Local app: http://127.0.0.1:3000'));
