import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/chart.js")) {
            return "admin-dashboard";
          }

          if (id.includes("src/pages/Dashboards/AdminDashboard")) {
            return "admin-dashboard";
          }

          if (id.includes("src/pages/Dashboards/UserDashboard")) {
            return "user-dashboard";
          }

          if (
            id.includes("src/pages/General") ||
            id.includes("src/components/Header") ||
            id.includes("src/components/Footer") ||
            id.includes("src/pages/404.jsx") ||
            id.includes("src/pages/LoadingPage.jsx")
          ) {
            return "public-site";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
