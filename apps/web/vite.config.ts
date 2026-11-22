import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { wireRoutesPlugin } from "./vite-plugin-routes.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), wireRoutesPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // The API's CORS/auth origin is pinned to :5173 (WEB_ORIGIN), so silently
    // falling back to :5174 would just break sign-in.
    strictPort: true,
    host: true,
  },
});
