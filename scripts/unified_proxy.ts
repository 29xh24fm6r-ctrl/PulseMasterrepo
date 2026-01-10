
import http from 'http';
import httpProxy from 'http-proxy';

const PORT = 8081;
const WEB_TARGET = 'http://localhost:3000';
const WS_TARGET = 'ws://localhost:8080';

const proxy = httpProxy.createProxyServer({
    ws: true,
    xfwd: true
});

proxy.on('error', (err, req, res) => {
    console.error('Proxy Error:', err);
    if (!res.headersSent && res.writeHead) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Proxy Error');
});

const server = http.createServer((req, res) => {
    // Forward all HTTP requests to Next.js (port 3000)
    console.log(`HTTP Proxy: ${req.method} ${req.url} -> ${WEB_TARGET}`);
    proxy.web(req, res, { target: WEB_TARGET });
});

server.on('upgrade', (req, socket, head) => {
    // Forward all WebSocket upgrades to Cyrano (port 8080)
    console.log(`WS Proxy: ${req.url} -> ${WS_TARGET}`);

    // Tap into the socket to see if data flows (Debug only)
    socket.on('data', (chunk) => {
        // console.log(`🔄 Proxy Socket Data: ${chunk.length} bytes`);
    });

    proxy.ws(req, socket, head, { target: WS_TARGET });
});

console.log(`
🔗 PULSE UNIFIED PROXY
======================
Listening on: http://localhost:${PORT}
HTTP -> ${WEB_TARGET} (Next.js)
WS   -> ${WS_TARGET} (Cyrano)

Tunnel this port: ngrok http ${PORT}
`);

server.listen(PORT);
