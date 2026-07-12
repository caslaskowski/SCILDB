import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://caslaskowski.github.io/SCILDB/ — assets must resolve under that subpath
  base: '/SCILDB/',
  plugins: [react(), tailwindcss()],
})
