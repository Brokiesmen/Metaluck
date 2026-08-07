import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Бэкенд Fastify (API). Обязательно тот же хост/порт, где слушает server (по умолчанию 3001).
  const apiProxy = env.VITE_DEV_API_PROXY?.trim() || 'http://127.0.0.1:3001';

  return {
  plugins: [
    react(),
    legacy({
      // Targets old Android WebView (Chrome 60+) and old iOS Safari
      targets: ['android >= 5', 'ios >= 11', 'chrome >= 60'],
      // Inject core-js polyfills for missing built-ins (Promise, fetch, etc.)
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.json'],
    // Единственная копия React (иначе @tonconnect/ui-react ловит "Invalid hook call").
    dedupe: ['react', 'react-dom'],
    alias: {
      // jsnext:main → src/ (CSS-modules, не собирается в Vite). Весь пакет → lib/ (UMD + main.css)
      'react-playing-cards': path.resolve(__dirname, 'node_modules/react-playing-cards/lib'),
    },
  },
  optimizeDeps: {
    // Общая копия React для @tonconnect/ui-react (иначе "Invalid hook call").
    include: ['react', 'react-dom', 'react/jsx-runtime', '@tonconnect/ui-react'],
  },
  build: {
    // target управляется plugin-legacy — явно не указываем
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5173,
    allowedHosts: true,
    host: true,
    // Только /api/* → бэкенд (VITE_DEV_API_PROXY, по умолчанию http://127.0.0.1:3001). Остальное — Vite.
    proxy: {
      '/api': {
        target: apiProxy,
        changeOrigin: true,
        secure: false,
        timeout: 60_000,
        // Aviator (/api/aviator/ws) — апгрейд до WebSocket через тот же proxy.
        ws: true,
      },
    },
  },
};
});
