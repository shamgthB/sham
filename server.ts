import express from 'express';
import path from 'path';
import { apiRouter } from './server/routes';

async function startServer() {
  const app = express();
  const DEFAULT_PORT = 3000;
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;

  // JSON Body parsing
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Main API Router
  app.use('/api', apiRouter);

  // Vite middleware for development vs static files for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err?.message });
  });

  // Resilient listener helper
  const startListening = (port: number, name: string) => {
    const s = app.listen(port, '0.0.0.0', () => {
      console.log(`Hostel Management Server running on ${name} port ${port}`);
    });
    s.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} (${name}) already in use.`);
      } else {
        console.error(`Error on port ${port} (${name}):`, err);
      }
    });
    return s;
  };

  // Always listen on standard port 3000 for AI Studio dev container and reverse proxy
  startListening(DEFAULT_PORT, 'default');

  // Also listen on Cloud Run assigned PORT if different from 3000
  if (envPort && envPort !== DEFAULT_PORT && !isNaN(envPort)) {
    startListening(envPort, 'Cloud Run');
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
