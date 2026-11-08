import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 接口服务（json-server）的地址。日常开发默认 3002；E2E 测试会通过 API_TARGET 指向它自己启动的那一份
const apiTarget = process.env.API_TARGET || 'http://localhost:3002';

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
      // 所有接口统一走 /api 前缀，转发时去掉前缀：/api/category -> http://localhost:3002/category。
      // 之前是按接口路径逐个代理（/book、/category、/ranking...），这些前缀和页面路由
      // （/book/:id、/book-list/:key、/category、/ranking）重名，直接打开或刷新这些页面时，
      // 浏览器请求的页面地址会被代理转给 json-server，拿到的是 JSON 而不是页面。
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
