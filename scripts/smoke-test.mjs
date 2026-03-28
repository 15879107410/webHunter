import { spawn } from "node:child_process";

const repoRoot = new URL("../", import.meta.url);
const externalApiBaseUrl = process.env.API_BASE_URL;
const smokePort = process.env.SMOKE_PORT ?? "3101";
const apiBaseUrl = externalApiBaseUrl ?? `http://127.0.0.1:${smokePort}`;

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: new URL(".", repoRoot),
      stdio: "inherit",
      ...options
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "null"}${signal ? ` (signal: ${signal})` : ""}`));
    });
  });
}

async function waitForHealthcheck(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`API healthcheck did not become ready within ${timeoutMs}ms`);
}

async function assertJson(path, predicate) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  const data = await response.json();
  if (!predicate(data)) {
    throw new Error(`${path} returned unexpected payload`);
  }

  console.log(`ok ${path}`);
}

async function assertJsonPost(path, body, predicate) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  const data = await response.json();
  if (!predicate(data)) {
    throw new Error(`${path} returned unexpected POST payload`);
  }

  console.log(`ok ${path} POST`);
}

async function assertText(path, predicate) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  const text = await response.text();
  if (!predicate(text)) {
    throw new Error(`${path} returned unexpected text payload`);
  }

  console.log(`ok ${path}`);
}

async function runAssertions() {
  await assertJson("/health", (data) => data.ok === true);
  await assertJson("/api/analysis", (data) => Array.isArray(data.items));
  await assertJson("/api/analysis/recent", (data) => Array.isArray(data.items));
  await assertJson("/api/analysis/runable", (data) => data.item?.siteName === "runable.com");
  await assertJson("/api/bookmarks", (data) => Array.isArray(data.items));
  await assertJsonPost("/api/analyze", { url: "https://runable.com/" }, (data) => data.id === "runable" && data.reused === true);
  await assertText("/api/analysis/runable/export.md", (text) => text.includes("# runable.com 分析报告"));
}

let serverProcess = null;

try {
  if (!externalApiBaseUrl) {
    await runCommand("npm", ["run", "build:api"]);

    serverProcess = spawn("npm", ["run", "start", "--workspace", "@webhunter/api"], {
      cwd: new URL(".", repoRoot),
      env: {
        ...process.env,
        PORT: smokePort
      },
      stdio: "inherit"
    });

    serverProcess.on("error", (error) => {
      throw error;
    });

    await waitForHealthcheck();
  }

  await runAssertions();
  console.log("API smoke test passed");
} finally {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    await new Promise((resolve) => {
      serverProcess.once("exit", resolve);
      setTimeout(resolve, 2_000);
    });
  }
}
