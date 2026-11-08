import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { EVENT_TYPES, loadConfig, runScenario, SCENARIOS } from './gateway.mjs';

const config = loadConfig();
const PORT = Number(process.env.PORT ?? 4000);
const history = [];
const indexHtml = new URL('../public/index.html', import.meta.url);

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e5) reject(new Error('Body terlalu besar'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Body harus JSON'));
      }
    });
  });

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(await readFile(indexHtml));
    }
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method === 'GET' && req.url === '/api/config') {
      return send(res, 200, {
        webhookUrl: config.webhookUrl,
        institutions: Object.keys(config.secrets), // kode saja, secret tidak pernah dikirim
        eventTypes: EVENT_TYPES,
        scenarios: SCENARIOS,
      });
    }
    if (req.method === 'GET' && req.url === '/api/deliveries') return send(res, 200, history);
    if (req.method === 'POST' && req.url === '/api/events') {
      const input = await readJson(req);
      const deliveries = await runScenario(config, input);
      const entry = { at: new Date().toISOString(), scenario: input.scenario ?? 'normal', deliveries };
      history.unshift(entry);
      history.length = Math.min(history.length, 50);
      return send(res, 200, entry);
    }
    send(res, 404, { error: 'Not found' });
  } catch (err) {
    send(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Mock payment gateway: port ${PORT}`);
  console.log(`Webhook target      : ${config.webhookUrl}`);
  const codes = Object.keys(config.secrets);
  console.log(`Institusi (secret)  : ${codes.length ? codes.join(', ') : 'TIDAK ADA - set HMAC_SECRET_<KODE>'}`);
});
