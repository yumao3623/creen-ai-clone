import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 3124;
const baseUrl = `http://127.0.0.1:${port}`;
const environment = {
  ...process.env,
  NEXT_DIST_DIR: ".phase11-next",
  PLAYWRIGHT_BROWSERS_PATH: "0",
};

function command(name, arguments_, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(name, arguments_, {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      windowsHide: true,
      shell:
        process.platform === "win32" && name.toLowerCase().endsWith(".cmd"),
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await delay(250);
  }
  throw new Error("Phase 11 production server did not become ready.");
}

async function main() {
  const packageManager = process.env.npm_execpath
    ? {
        executable: process.execPath,
        arguments_: [process.env.npm_execpath, "build"],
      }
    : {
        executable: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
        arguments_: ["build"],
      };
  const buildExitCode = await command(
    packageManager.executable,
    packageManager.arguments_,
  );
  if (buildExitCode !== 0) process.exit(buildExitCode);

  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: environment,
      stdio: "inherit",
      windowsHide: true,
    },
  );

  try {
    await waitForServer();
    const testExitCode = await command(process.execPath, [
      "node_modules/@playwright/test/cli.js",
      "test",
    ]);
    process.exitCode = testExitCode;
  } finally {
    server.kill();
  }
}

await main();
