import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function getBuildVersion() {
  try {
    const isShallow = execSync("git rev-parse --is-shallow-repository", {
      encoding: "utf8",
    }).trim() === "true";

    if (isShallow) {
      try {
        execSync("git fetch --unshallow", { stdio: "ignore" });
      } catch {
        // Keep the locally available history as a fallback.
      }
    }

    const commitCount = Number(
      execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim()
    );

    if (Number.isFinite(commitCount) && commitCount > 0) {
      return (commitCount / 10).toFixed(1);
    }
  } catch {
    // Fallback for environments without Git history available.
  }

  return "0.0";
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(getBuildVersion()),
  },
});
