import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/headerCarousel': {
        target: 'http://localhost:3002', //请求到http://localhost:3002/headerCarousel
        changeOrigin: true,
      },
      '/bookList': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/searchHot': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/ranking': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/rank': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '^/rank_00[1-4]': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/category': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/book': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/chapterInfo': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/chapterInfoDetail':{
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/chapterContent':{
        target: 'http://localhost:3002',
        changeOrigin: true,
      }
    },
  },
});
