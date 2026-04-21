import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5001'

  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/react-router-dom')) {
              return 'vendor-router'
            }
            if (id.includes('node_modules/@tanstack/react-query')) {
              return 'vendor-query'
            }
            return undefined
          },
        },
      },
    },
    server: {
      host:true,
      port: 5173,
      proxy: {
        '/api': apiProxyTarget,
      },
    },
  }
})
