#!/usr/bin/env node

import http from "http";
import fs from "fs/promises";
import path from "path";
import { getInjectorScript } from "./injector";

const DEFAULT_PORT = 4567;
const REMARQ_DIR = ".remarq";

const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
  init();
} else if (command === "start" || !command) {
  start();
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else {
  console.log(`Unknown command: ${command}`);
  printHelp();
}

function printHelp() {
  console.log(`
  remarq — Pin-and-comment feedback for your app

  Usage:
    remarq init         Set up remarq in this project
    remarq              Start the comment server
    remarq start        Same as above
    remarq help         Show this help

  Options:
    --port <number>     Port to run on (default: ${DEFAULT_PORT})
    --keep-comments     Add .remarq/ to git (share comments with team)
  `);
}

function getPort(): number {
  const idx = args.indexOf("--port");
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) || DEFAULT_PORT : DEFAULT_PORT;
}

// ── remarq init ──────────────────────────────────────────────

async function init() {
  const cwd = process.cwd();
  const remarqDir = path.join(cwd, REMARQ_DIR);
  const keepComments = args.includes("--keep-comments");

  console.log("\n  Setting up remarq...\n");

  // 1. Create .remarq/ directory
  await fs.mkdir(remarqDir, { recursive: true });
  console.log("  ✓ Created .remarq/ directory");

  // 2. Add to .gitignore (unless --keep-comments)
  if (!keepComments) {
    const gitignorePath = path.join(cwd, ".gitignore");
    try {
      let content = "";
      try { content = await fs.readFile(gitignorePath, "utf-8"); } catch {}
      if (!content.includes(".remarq")) {
        content += "\n# Remarq comments\n.remarq/\n";
        await fs.writeFile(gitignorePath, content, "utf-8");
        console.log("  ✓ Added .remarq/ to .gitignore");
      } else {
        console.log("  · .remarq/ already in .gitignore");
      }
    } catch {
      console.log("  · Could not update .gitignore");
    }
  } else {
    console.log("  · Comments will be committed to git");
  }

  // 3. Detect framework and create API route
  const framework = await detectFramework(cwd);
  if (framework === "nextjs") {
    await setupNextjs(cwd);
  } else {
    console.log("  · No framework detected — use the CLI server mode");
  }

  // 4. Print next steps
  console.log(`
  Done! Next steps:

  1. Add to your root layout:

     import { RemarqProvider, CommentOverlay, CommentToggle, CommentSidebar } from "remarq";

     <RemarqProvider pageId={pathname}>
       {children}
       <CommentOverlay />
       <CommentSidebar />
       <CommentToggle />
     </RemarqProvider>

  2. Run: remarq
     (starts the comment server)

  3. Press C on any page to start commenting
  `);
}

async function detectFramework(cwd: string): Promise<string | null> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps["next"]) return "nextjs";
    if (deps["vite"]) return "vite";
    return null;
  } catch {
    return null;
  }
}

async function setupNextjs(cwd: string) {
  // Check for app router
  const appDir = path.join(cwd, "src", "app");
  const appDirAlt = path.join(cwd, "app");
  let routeDir: string;

  try {
    await fs.access(appDir);
    routeDir = path.join(appDir, "api", "remarq");
  } catch {
    try {
      await fs.access(appDirAlt);
      routeDir = path.join(appDirAlt, "api", "remarq");
    } catch {
      console.log("  · Could not find app/ directory — create API route manually");
      return;
    }
  }

  await fs.mkdir(routeDir, { recursive: true });
  const routeFile = path.join(routeDir, "route.ts");

  try {
    await fs.access(routeFile);
    console.log("  · API route already exists at api/remarq/route.ts");
  } catch {
    await fs.writeFile(routeFile, `export { GET, POST } from "remarq/adapters/nextjs";\n`, "utf-8");
    console.log("  ✓ Created api/remarq/route.ts");
  }
}

// ── remarq start ─────────────────────────────────────────────

async function start() {
  const port = getPort();
  const cwd = process.cwd();
  const projectDir = path.join(cwd, REMARQ_DIR);
  const projectName = path.basename(cwd);

  // Check if .remarq exists
  try {
    await fs.access(projectDir);
  } catch {
    console.log("\n  .remarq/ not found. Run 'remarq init' first.\n");
    return;
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url ?? "/", `http://localhost:${port}`);

    // Serve injector script (for non-React sites)
    if (url.pathname === "/remarq.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.writeHead(200);
      res.end(getInjectorScript(port));
      return;
    }

    // GET comments (single page or all pages)
    if (req.method === "GET" && url.pathname === "/api/remarq") {
      const pageId = url.searchParams.get("pageId");

      if (!pageId) {
        // Return all pages
        try {
          const files = await fs.readdir(projectDir);
          const pages: { pageId: string; threads: unknown[] }[] = [];
          for (const file of files) {
            if (!file.endsWith(".json")) continue;
            try {
              const data = await fs.readFile(path.join(projectDir, file), "utf-8");
              const threads = JSON.parse(data);
              if (Array.isArray(threads) && threads.length > 0) {
                pages.push({ pageId: file.replace(".json", ""), threads });
              }
            } catch {}
          }
          pages.sort((a, b) => {
            const aT = Math.max(...(a.threads as Array<{ createdAt: string }>).map((t) => new Date(t.createdAt).getTime()));
            const bT = Math.max(...(b.threads as Array<{ createdAt: string }>).map((t) => new Date(t.createdAt).getTime()));
            return bT - aT;
          });
          res.setHeader("Content-Type", "application/json");
          res.writeHead(200);
          res.end(JSON.stringify(pages));
        } catch {
          res.writeHead(200);
          res.end("[]");
        }
        return;
      }

      // Single page
      const file = path.join(projectDir, `${pageId.replace(/[^a-zA-Z0-9_-]/g, "")}.json`);
      try {
        const data = await fs.readFile(file, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(data);
      } catch {
        res.writeHead(200);
        res.end("[]");
      }
      return;
    }

    // POST comments
    if (req.method === "POST" && url.pathname === "/api/remarq") {
      const pageId = url.searchParams.get("pageId");
      if (!pageId) { res.writeHead(400); res.end('{"error":"Missing pageId"}'); return; }

      const file = path.join(projectDir, `${pageId.replace(/[^a-zA-Z0-9_-]/g, "")}.json`);
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", async () => {
        try {
          await fs.writeFile(file, JSON.stringify(JSON.parse(body), null, 2), "utf-8");
          res.writeHead(200);
          res.end('{"ok":true}');
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(port, () => {
    console.log(`
  remarq is running

  Project: ${projectName}
  Server:  http://localhost:${port}
  Storage: .remarq/

  Press Ctrl+C to stop
    `);
  });

  process.on("SIGINT", () => { console.log("\n  remarq stopped."); process.exit(0); });
}
