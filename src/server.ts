import 'dotenv/config';
import app from './app';
import { connectDatabase } from './config/db';
const port = Number(process.env.PORT ?? 3000);
const mongoUri = process.env.MONGODB_URI;
async function start(): Promise<void> {
  if (!mongoUri) throw new Error('MONGODB_URI environment variable is required');
  await connectDatabase(mongoUri);
  const server = app.listen(port, () => console.log(`API listening on port ${port}`));
  const shutdown = (signal: string) => { console.log(`${signal} received; shutting down`); server.close(() => { void import('mongoose').then(({ default: mongoose }) => mongoose.disconnect()).finally(() => process.exit(0)); }); };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
start().catch(error => { console.error('Failed to start API', error); process.exit(1); });
