import { URL, fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: env.VITE_MODE === 'ykt' ? '/mas-wrestling/' : '/',
    plugins: [
      vue(),
      VueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    ssgOptions: {
      includedRoutes(paths: any) {
        return paths.filter((i: any) => !i.includes('game') && !i.includes('scores'))
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console'] : undefined,
    },
  }
})
