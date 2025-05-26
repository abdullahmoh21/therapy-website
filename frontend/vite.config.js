import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), visualizer({ open: true, filename: "dist/stats.html" })],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "react-core"; // React-specific chunk
          }

          if (id.includes("node_modules")) {
            return "vendor"; // Other node_modules
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
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
