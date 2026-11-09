import { createServer } from 'vite';

async function start() {
  try {
    const server = await createServer({
      configFile: './vite.config.js',
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
      },
    });

    await server.listen();
    server.printUrls();
    console.log('⚡ Dapitan Vite dev server ready on port 5173');
  } catch (err) {
    console.error('Failed to start Vite dev server:', err);
    process.exit(1);
  }
}

start();
