import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api calls go to the local backend, so the frontend never needs a hard-coded URL.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:5000" } },
});
