import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'www.mentor-tutors.org',
      'mentor-tutors.org'
    ],
    host: true,
    // ★ THIS IS THE CRITICAL PART FOR THE PHONE ★
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Points to your Python Backend
        changeOrigin: true,
        secure: false,
      }
    }
  },
})