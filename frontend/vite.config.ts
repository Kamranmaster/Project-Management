import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // In development the API is proxied so the browser sees a single origin:
  // httpOnly auth cookies just work and CORS is not involved.
  const backendUrl = env.VITE_DEV_BACKEND_URL || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: backendUrl, changeOrigin: true },
        "/images": { target: backendUrl, changeOrigin: true },
      },
    },
  };
});
