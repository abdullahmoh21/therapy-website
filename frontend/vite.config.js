import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux", "reselect"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "joi"],
          "vendor-ui": ["primereact", "react-icons", "framer-motion"],
          "vendor-charts": ["react-chartjs-2", "chart.js"],
          "vendor-dates": ["date-fns", "date-fns-tz"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    allowedHosts: true,
  },
});
