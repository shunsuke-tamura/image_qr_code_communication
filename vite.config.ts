import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // development server port
  server: {
    port: 3000,
    proxy: {
      "/api": {
        // target: "http://localhost:8080",
        target: "https://q9b0ps93-8080.asse.devtunnels.ms",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
