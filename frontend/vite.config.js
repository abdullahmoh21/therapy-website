import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../backend/config/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../backend/config/cert.pem')),
      // This will ignore SSL certificate errors
      rejectUnauthorized: false,
    },
  },
})
