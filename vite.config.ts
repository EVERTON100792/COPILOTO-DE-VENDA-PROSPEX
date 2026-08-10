import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      // /api/opencode_zen/zen/v1/chat/completions → https://opencode.ai/zen/v1/chat/completions
      '/api/opencode_zen': {
        target: 'https://opencode.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opencode_zen/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[Proxy opencode_zen]', err.message))
          proxy.on('proxyReq', (_req, req) => console.info('[Proxy opencode_zen]', req.url))
        },
      },
      '/api/opencode_go': {
        target: 'https://opencode.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opencode_go/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[Proxy opencode_go]', err.message))
          proxy.on('proxyReq', (_req, req) => console.info('[Proxy opencode_go]', req.url))
        },
      },
      // /api/openrouter/api/v1/chat/completions → https://openrouter.ai/api/v1/chat/completions
      '/api/openrouter': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openrouter/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[Proxy openrouter]', err.message))
        },
      },
      // /api/openai/v1/chat/completions → https://api.openai.com/v1/chat/completions
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[Proxy openai]', err.message))
        },
      },
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})