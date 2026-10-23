import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRouter from './routes/auth';
import loansRouter from './routes/loans';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ---- Middleware ----
app.use(cors({
  origin: '*', // Restrict in production
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipt images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ---- Health Check ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Routes ----
app.use('/auth', authRouter);
app.use('/loans', loansRouter);

// ---- 404 Handler ----
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ---- Global Error Handler ----
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message ?? 'Internal server error' });
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\n🚀 MiniLedger API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

export default app;
