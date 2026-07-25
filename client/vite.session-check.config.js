// Throwaway config: serves session-check.html against the mock API on 5099,
// so the real dev server (5180 -> 5001) is left untouched.
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5181,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5099',
    },
  },
})
