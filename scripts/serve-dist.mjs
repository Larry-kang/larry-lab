import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 4321);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function parseHeadersFile(headersPath) {
  if (!fs.existsSync(headersPath)) return [];
  const content = fs.readFileSync(headersPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const rules = [];
  let currentPattern = null;
  let currentHeaders = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
      if (currentPattern) {
        rules.push({ pattern: currentPattern, headers: currentHeaders });
      }
      currentPattern = line;
      currentHeaders = {};
    } else if (currentPattern) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        currentHeaders[key] = value;
      }
    }
  }
  if (currentPattern) {
    rules.push({ pattern: currentPattern, headers: currentHeaders });
  }
  return rules;
}

const headerRules = parseHeadersFile(path.join(distDir, '_headers'));

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Apply security headers parsed from dist/_headers
  for (const rule of headerRules) {
    if (rule.pattern === '/*' || pathname.startsWith(rule.pattern.replace('/*', ''))) {
      for (const [k, v] of Object.entries(rule.headers)) {
        res.setHeader(k, v);
      }
    }
  }

  let filePath = path.join(distDir, pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.statusCode = 200;
    fs.createReadStream(filePath).pipe(res);
  } else {
    // 404 handler
    const notFoundPath = path.join(distDir, '404.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 404;
    if (fs.existsSync(notFoundPath)) {
      fs.createReadStream(notFoundPath).pipe(res);
    } else {
      res.end('404 Not Found');
    }
  }
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
