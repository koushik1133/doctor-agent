import { defineConfig } from "vitest/config";
import path from "node:path";

const __dirname = import.meta.dirname;

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60000,
    env: { DATA_FILE: path.join(process.env.TMPDIR || "/tmp", "doctor-agent-test-store.json") },
  },
});
