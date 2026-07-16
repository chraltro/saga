import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: mode === 'production' ? '/saga/' : '/',
    server: {
      port: 3000,
      host: '127.0.0.1',
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'shared',
            dest: '.'
          }
        ]
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/marked') || id.includes('node_modules/dompurify')) {
              return 'markdown';
            }
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'marked']
    }
  };
});
