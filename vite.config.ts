import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev-only: forward API calls to the local Fastify server.
      // Override with API_PORT when the default port is occupied.
      '/api': `http://localhost:${process.env.API_PORT ?? '3000'}`,
    },
  },
})
