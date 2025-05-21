import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.js'),
          idlePreload: resolve(__dirname, 'src/preload/idlePreload.mjs')
        },
        output: {
          format: 'es'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      outDir: 'out/renderer', 
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          idle: resolve(__dirname, 'src/renderer/idle.html'),
        }
      }
    },
    plugins: [react()]
  }
})
