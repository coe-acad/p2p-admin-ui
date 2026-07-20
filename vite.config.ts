import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Port 5174 keeps us clear of p2p's dev server (port 8080).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
