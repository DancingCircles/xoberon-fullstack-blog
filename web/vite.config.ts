import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = env.VITE_API_BASE_URL
    ? {
        '/api': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
      }
    : undefined

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      ...(proxy ? { proxy } : {}),
    },
  }
})
