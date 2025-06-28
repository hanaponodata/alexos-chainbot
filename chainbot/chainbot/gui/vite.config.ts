import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/sessions': 'http://localhost:8000',
      '/agents': 'http://localhost:8000',
      '/workflows': 'http://localhost:8000',
      '/entanglements': 'http://localhost:8000',
      '/audit_logs': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
}) 