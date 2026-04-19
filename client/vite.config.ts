import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.json'],
  },
  build: {
    target: 'es2015',
  },
  esbuild: {
    target: 'es2015',
  },
  server: {
    port: 5173,
    allowedHosts: true,
    host: true, // Listen on all local IPs
    // Proxy /api to backend — no CORS issues in dev
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
