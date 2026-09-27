import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works in Tauri and on any web sub-path (e.g. GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
})
