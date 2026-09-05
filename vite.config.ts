import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function getBuildVersion() {
  try {
    const commitCount = Number(
      execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim()
    );

    if (Number.isFinite(commitCount) && commitCount > 0) {
      return (commitCount / 10).toFixed(1);
    }
  } catch {
    // Fallback for environments without the Git history available.
  }

  return "0.0";
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(getBuildVersion()),
  },
});
