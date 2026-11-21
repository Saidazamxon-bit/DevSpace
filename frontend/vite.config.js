import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is written to ../public/app and served by PHP (views/layouts/app.php).
// No Node.js process is needed on the server.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          highlight: ['highlight.js/lib/core'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
