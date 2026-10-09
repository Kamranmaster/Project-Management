import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only the backend suite; the frontend has its own Vitest setup in frontend/.
    include: ["tests/**/*.test.js"],
    environment: "node",
    // Fake values so modules that read secrets at request time work without a .env file.
    env: {
      NODE_ENV: "test",
      ACCESS_TOKEN_SECRET: "test-access-secret",
      ACCESS_TOKEN_EXPIRY: "1d",
      REFRESH_TOKEN_SECRET: "test-refresh-secret",
      REFRESH_TOKEN_EXPIRY: "10d",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
