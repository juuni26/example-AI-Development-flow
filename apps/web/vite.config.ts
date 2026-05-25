import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Load .env files from the workspace ROOT so the web dev server reads the
// same VITE_API_URL the rest of the workspace uses. Without this Vite only
// looks at apps/web/.env and devs would have to duplicate the variable.
const WORKSPACE_ROOT = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  envDir: WORKSPACE_ROOT,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@cleandrop/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  preview: {
    port: 5173,
    host: true,
  },
});
