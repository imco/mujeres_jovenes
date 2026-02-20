import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    {
      name: 'copy-scrollytelling',
      closeBundle() {
        cpSync(
          resolve(__dirname, 'scrollytelling'),
          resolve(__dirname, 'dist/scrollytelling'),
          { recursive: true }
        )
        console.log('✓ scrollytelling/ copiado a dist/')
      }
    }
  ]
})
