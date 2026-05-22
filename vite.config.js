import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // In development, proxy all /api calls to the backend so you don't
  // need to handle CORS or hardcode the URL.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir:    'dist',
    sourcemap: false,
  },
});
