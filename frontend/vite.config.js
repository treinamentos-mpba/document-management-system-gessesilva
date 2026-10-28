import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuração mínima do Vite. O proxy direciona chamadas /api para o backend
// local durante o desenvolvimento (Passo 3 e Passo 4 - integração).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/main.jsx', 'src/test/**'],
      reporter: ['text', 'html'],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
