import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Vite Plugin for Real Sound Auto-Discovery from public/Sounds/
 * Dynamically intercepts and generates src/config/soundCatalog.js synchronously at build/dev time.
 */
function soundAutoDiscoveryPlugin() {
  return {
    name: 'vite-plugin-sound-auto-discovery',
    transform(code, id) {
      if (id.endsWith('src/config/soundCatalog.js') || id.endsWith('src\\config\\soundCatalog.js')) {
        const soundsDir = path.resolve(process.cwd(), 'public/Sounds')
        let files = []
        try {
          if (fs.existsSync(soundsDir)) {
            files = fs.readdirSync(soundsDir, { withFileTypes: true })
          }
        } catch (e) {
          console.warn('[SoundDiscovery] Error reading public/Sounds:', e)
        }

        const audioExts = ['.mp3', '.wav', '.ogg', '.m4a']
        const sounds = []

        const rootDir = path.resolve(process.cwd(), 'public')
        try {
          const rootFiles = fs.readdirSync(rootDir)
          if (rootFiles.includes('mudo.mp3')) {
            sounds.push({ label: 'mudo.mp3 (/mudo.mp3)', value: '/mudo.mp3' })
          }
        } catch (e) {}

        files.forEach(file => {
          if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase()
            if (audioExts.includes(ext)) {
              const filename = file.name
              const encodedPath = `/Sounds/${encodeURIComponent(filename)}`
              sounds.push({
                label: filename,
                value: encodedPath
              })
            }
          }
        })

        sounds.sort((a, b) => a.label.localeCompare(b.label))

        return {
          code: `/**
 * Sound Catalog - Auto-Discovered dynamically from public/Sounds/
 */
export const AVAILABLE_SOUNDS = ${JSON.stringify(sounds, null, 2)};`,
          map: null
        }
      }
    },
    configureServer(server) {
      const soundsDir = path.resolve(process.cwd(), 'public/Sounds')
      server.watcher.add(soundsDir)
      server.watcher.on('add', (filePath) => {
        if (filePath.includes('public/Sounds') || filePath.includes('public\\Sounds')) {
          console.log('[SoundDiscovery] Sound file added:', filePath)
          server.moduleGraph.invalidateAll()
          server.ws.send({ type: 'full-reload' })
        }
      })
      server.watcher.on('unlink', (filePath) => {
        if (filePath.includes('public/Sounds') || filePath.includes('public\\Sounds')) {
          console.log('[SoundDiscovery] Sound file removed:', filePath)
          server.moduleGraph.invalidateAll()
          server.ws.send({ type: 'full-reload' })
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), soundAutoDiscoveryPlugin()],
  server: {
    host: '0.0.0.0',
    // The public hostname is generated dynamically by the Cloudflare Quick Tunnel.
    // Allowing all hosts is intentional for this local-only development server.
    allowedHosts: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        preview: path.resolve(__dirname, 'preview.html'),
      },
    },
  },
})
