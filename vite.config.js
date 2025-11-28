// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import path from 'path'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     allowedHosts: true
//   },
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//     },
//     extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
//   },
//   optimizeDeps: {
//     esbuildOptions: {
//       loader: {
//         '.js': 'jsx',
//       },
//     },
//   },
// }) 

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',       // Allows external access (for Replit/Lovable preview)
    port: 8080,            // Use 8080 — Lovable’s preferred port
    allowedHosts: true,    // Allow all hosts
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})