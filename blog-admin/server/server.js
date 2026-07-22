const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[server] Running in ${env.nodeEnv} mode on port ${env.port} — one server for site + admin + API`);
    console.log(`[server] Marketing site: ${env.appUrl}/`);
    console.log(`[server] Blog:          ${env.appUrl}/blog.html`);
    console.log(`[server] Admin panel:   ${env.appUrl}/admin/login`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...', err);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
}

start();
