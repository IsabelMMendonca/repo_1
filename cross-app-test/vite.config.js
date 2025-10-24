// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [vue(), react(),tailwindcss()],
  resolve: {
    alias: {
      // force both projects to use THIS React/ReactDOM
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@': path.resolve(__dirname, './src'),
    },
    fs: {
      // allow the React repo path
      allow: ['..', '/absolute/path/to/ndf-insight-brasil-main'],
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // make sure Vite pre-bundles them (don’t exclude!)
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
})
