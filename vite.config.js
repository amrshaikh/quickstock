import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'QuickStock',
        short_name: 'QuickStock',
        description: 'Inventory management and checkout system for Quba Dates',
        theme_color: '#d97706', // Warm amber
        background_color: '#fffbeb', // Warm white
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg', // Placeholder
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/vite.svg', // Placeholder
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
