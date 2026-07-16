import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'foodie',
        short_name: 'foodie',
        description: 'Hold styr på dagens kalorier',
        lang: 'da',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf8f5',
        theme_color: '#2f7d4f',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Ingen runtimeCaching: Supabase-kald må aldrig caches af service workeren —
      // offline-data håndteres af appen selv via localStorage
      devOptions: { enabled: false },
    }),
  ],
})
