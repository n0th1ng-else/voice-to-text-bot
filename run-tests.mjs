import { spawn } from "node:child_process";
import { rmSync, existsSync } from "node:fs";

const REPORTS_DIR = ".vitest-reports";
const SHARD_COUNT = 2;

if (existsSync(REPORTS_DIR)) {
  rmSync(REPORTS_DIR, { recursive: true, force: true });
}

function runVitest(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("pnpm", ["vitest", ...args], {
      stdio: "inherit",
      shell: true,
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${code}`));
    });
  });
}

const shardResults = await Promise.allSettled(
  Array.from({ length: SHARD_COUNT }, (_, i) =>
    runVitest(["run", "--reporter=blob", `--shard=${i + 1}/${SHARD_COUNT}`]),
  ),
);

// eslint-disable-next-line
console.log("\nMerging blob reports...");
try {
  await runVitest(["run", `--mergeReports=${REPORTS_DIR}`]);
} catch {
  process.exitCode = 1;
}

const passed = shardResults.filter((r) => r.status === "fulfilled").length;
const failed = shardResults.filter((r) => r.status === "rejected").length;
// eslint-disable-next-line
console.log(`\nShard results: ${passed} passed, ${failed} failed (${SHARD_COUNT} total)`);
