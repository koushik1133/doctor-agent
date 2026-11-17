// Keeps regenerable folders out of iCloud Drive sync on macOS. With "Optimize
// Mac Storage" on, iCloud offloads files in synced folders (Desktop, Documents)
// and reads of offloaded files block — which hangs tsc, next dev and tests.
// No-op on other platforms or when xattr isn't available.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

if (process.platform === "darwin") {
  for (const dir of ["node_modules", ".next"]) {
    try {
      mkdirSync(dir, { recursive: true });
      execFileSync("xattr", ["-w", "com.apple.fileprovider.ignore#P", "1", dir]);
    } catch {
      /* not fatal */
    }
  }
}
