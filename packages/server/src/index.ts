import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { setupSocketIO } from './socket/index.js';
import gamesRouter from './routes/games.js';
import hostRouter from './routes/host.js';
import { clerk } from './middleware/auth.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Clerk auth — populates req.auth for all routes
app.use(clerk);

// REST routes
app.use('/api', gamesRouter);
app.use('/api/host', hostRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In production, serve the client build
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
setupSocketIO(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});
