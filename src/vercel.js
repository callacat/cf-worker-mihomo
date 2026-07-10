import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { buildConfig } from './utils/env.js';
import { handleRequest } from './utils/handler.js';


async function handler(req, res) {
    const e = buildConfig(req, process.env, true);

    try {
        const result = await handleRequest(e);

        for (const [key, value] of Object.entries(result.headers || {})) {
            res.setHeader(key, value);
        }

        res.statusCode = result.status;
        res.end(result.body);

    } catch (err) {
        res.statusCode = 400;
        res.setHeader(
            'Content-Type',
            'application/json; charset=utf-8'
        );

        res.end(JSON.stringify({
            error: err.message
        }));
    }
}


function createAppServer() {
    return createServer(async (req, res) => {
        const url = new URL(
            req.url,
            'http://localhost'
        );

        if (url.pathname.startsWith('/template/')) {
            const filePath = path.join(
                process.cwd(),
                url.pathname
            );

            if (fs.existsSync(filePath)) {
                res.writeHead(200);

                fs.createReadStream(filePath)
                    .pipe(res);

                return;
            }
        }

        await handler(req, res);
    });
}


function startServer(port) {
    const server = createAppServer();

    server.listen(port, () => {
        console.log(`dev running: http://localhost:${port}`);
    });

    server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`端口 ${port} 被占用，尝试 ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });

    return server;
}


// Vercel Node Runtime 会检测这个 listen()
startServer(Number(process.env.PORT) || 3000);