/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174 is webapp-ui's; running both would have Vite silently bump this one
    // to whatever is free, so the explorer's URL moved between runs.
    port: 5175,
    proxy: {
      "/v1": {
        target: process.env.VITE_API_TARGET || "http://localhost:3002",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.VITE_API_TARGET || "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
  test: {
    // The pure modules — formatting, denomination, aggregation, chart geometry,
    // the mock backend — plus a server-render smoke test over the real tree.
    // None of them need a DOM, so there is no jsdom in the toolchain.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
