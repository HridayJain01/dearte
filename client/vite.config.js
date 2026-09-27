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
            // Exact package names: a bare 'node_modules/react' prefix also caught
            // react-router, react-hook-form and react-zoom-pan-pinch, loading the
            // last two up front on every page instead of with the forms/PDP that use them.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
              return 'vendor-react'
            }
            if (/node_modules\/react-router(-dom)?\//.test(id)) {
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
      port: 5180,
      strictPort: true,
      proxy: {
        '/api': apiProxyTarget,
      },
    },
  }
})
