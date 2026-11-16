import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

//only used by the tests: next builds the app, vite just transforms test files
export default defineConfig({
  //react for JSX in components
  plugins: [react()],
  //reads the "@/*" paths from tsconfig.json so "@/lib/..." imports resolve
  resolve: { tsconfigPaths: true },
  test: {
    //a fake browser (document, window) for rendering components
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
  },
});
