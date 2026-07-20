import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://caslaskowski.github.io/SCILDB/ — assets must resolve under that subpath
  base: '/SCILDB/',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Split the heavyweight libraries into their own cacheable chunks so the
        // main bundle stays under the 500 kB warning threshold. Recharts (and
        // the d3 modules it drags in) is by far the largest dependency.
        codeSplitting: {
          groups: [
            { name: 'recharts', test: /node_modules[\\/](recharts|d3-|victory-vendor|decimal\.js|internmap|delaunator|robust-predicates)/ },
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
