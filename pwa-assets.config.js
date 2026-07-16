import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.35,
      resizeOptions: { background: '#2f7d4f' },
    },
    apple: {
      sizes: [180],
      padding: 0.1,
      resizeOptions: { background: '#2f7d4f' },
    },
  },
  images: ['public/favicon.svg'],
})
