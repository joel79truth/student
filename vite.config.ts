import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // This tells Vite to look for the .env file in the backend folder
  envDir: './backend', 
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    allowedHosts: ['student-plp2.onrender.com'],
    port: 4173,
  },
})