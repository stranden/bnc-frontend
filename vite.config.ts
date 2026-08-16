import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(env.VITE_PORT ?? 5173),
      // When VITE_BACKEND_URL is set, /api is proxied to the BNC backend so the
      // browser never talks to it cross-origin during development. The backend
      // itself serves everything under /api, so no path rewrite is needed.
      proxy: env.VITE_BACKEND_URL
        ? {
            '/api': {
              target: env.VITE_BACKEND_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  }
})
