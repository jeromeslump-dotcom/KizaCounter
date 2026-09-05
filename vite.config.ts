import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

async function getCommitCountFromGitHub(ref: string) {
  const response = await fetch(
    `https://api.github.com/repos/jeromeslump-dotcom/KizaCounter/commits?sha=${encodeURIComponent(ref)}&per_page=1`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "KizaCounter-build",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const link = response.headers.get("link") ?? "";
  const lastPageMatch = link.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/);

  if (lastPageMatch) {
    return Number(lastPageMatch[1]);
  }

  const commits = (await response.json()) as unknown[];
  return commits.length;
}

async function getBuildVersion() {
  let ref = process.env.VERCEL_GIT_COMMIT_SHA;

  if (!ref) {
    try {
      ref = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
      ref = undefined;
    }
  }

  if (ref) {
    try {
      const commitCount = await getCommitCountFromGitHub(ref);

      if (Number.isFinite(commitCount) && commitCount > 0) {
        return (commitCount / 10).toFixed(1);
      }
    } catch {
      // Fall back to the local Git history below.
    }
  }

  try {
    const commitCount = Number(
      execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim()
    );

    if (Number.isFinite(commitCount) && commitCount > 0) {
      return (commitCount / 10).toFixed(1);
    }
  } catch {
    // Keep the final fallback below.
  }

  return "0.0";
}

export default defineConfig(async () => ({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(await getBuildVersion()),
  },
}));
