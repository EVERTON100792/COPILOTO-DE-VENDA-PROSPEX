import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiApiKey = env.AI_API_KEY || ''

  const proxyOptions = (prefix: string, target: string) => ({
    target,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(new RegExp(`^${prefix}`), ''),
    secure: true,
    configure: (proxy: any) => {
      proxy.on('error', (err: Error) => console.error(`[Proxy ${prefix}]`, err.message))
      proxy.on('proxyReq', (proxyReq: any, req: any) => {
        console.info(`[Proxy ${prefix}]`, req.url)
        if (aiApiKey) proxyReq.setHeader('Authorization', `Bearer ${aiApiKey}`)
      })
    },
  })

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: false,
      proxy: {
        // /api/opencode_zen/zen/v1/chat/completions → https://opencode.ai/zen/v1/chat/completions
        '/api/opencode_zen': proxyOptions('/api/opencode_zen', 'https://opencode.ai'),
        // /api/opencode_go/zen/go/v1/chat/completions → https://opencode.ai/zen/go/v1/chat/completions
        '/api/opencode_go': proxyOptions('/api/opencode_go', 'https://opencode.ai'),
        // /api/openrouter/api/v1/chat/completions → https://openrouter.ai/api/v1/chat/completions
        '/api/openrouter': proxyOptions('/api/openrouter', 'https://openrouter.ai'),
        // /api/openai/v1/chat/completions → https://api.openai.com/v1/chat/completions
        '/api/openai': proxyOptions('/api/openai', 'https://api.openai.com'),
        '/api/gemini': proxyOptions('/api/gemini', 'https://generativelanguage.googleapis.com'),
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
  }
})