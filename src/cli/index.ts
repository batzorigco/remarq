#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
  init();
} else if (command === "remove") {
  remove();
} else if (command === "help" || command === "--help" || command === "-h" || !command) {
  printHelp();
} else {
  console.log(`  Unknown command: ${command}\n`);
  printHelp();
}

function printHelp() {
  console.log(`
  remarq — Pin-and-comment feedback for your app

  Usage:
    remarq init [mode]    Set up remarq in this project
    remarq remove         Remove remarq from this project
    remarq help           Show this help

  Modes:
    --dev        Default. Active in dev + staging only.
                 Comments gitignored, route committed.
                 Force on staging: NEXT_PUBLIC_REMARQ=true

    --personal   Active in local dev only. Everything gitignored.
                 Your private feedback, nothing in git.

    --public     Active in ALL environments including production.
                 Comments committed to git.
                 Disable: NEXT_PUBLIC_REMARQ=false
  `);
}

type Mode = "dev" | "personal" | "public";

function getMode(): Mode {
  if (args.includes("--personal")) return "personal";
  if (args.includes("--public")) return "public";
  return "dev";
}

// ── remarq init ──────────────────────────────────────────────

async function init() {
  const cwd = process.cwd();
  const mode = getMode();

  console.log(`\n  Setting up remarq (${mode} mode)...\n`);

  // 1. Create .remarq/ directory
  await fs.mkdir(path.join(cwd, ".remarq"), { recursive: true });
  console.log("  ✓ Created .remarq/ directory");

  // 2. Update .gitignore based on mode
  await updateGitignore(cwd, mode);

  // 3. Detect framework
  const framework = await detectFramework(cwd);

  // 4. Check if package is installed
  const hasPackage = await checkDependency(cwd);
  if (!hasPackage) {
    console.log("  → Run: npm install remarq");
  }

  // 5. Framework-specific setup
  if (framework === "nextjs") {
    const routeCreated = await setupNextjs(cwd);
    const wrapperCreated = await createWrapper(cwd, mode);

    if (!routeCreated && !wrapperCreated) {
      console.log("\n  remarq is already set up. Run your dev server and press C to comment.\n");
    } else {
      console.log(`
  Done! Add one line to your root layout:

  import { RemarqWrapper } from "@/components/remarq-wrapper";

  export default function Layout({ children }) {
    return (
      <html>
        <body>
          <RemarqWrapper>{children}</RemarqWrapper>
        </body>
      </html>
    );
  }

  Mode: ${mode}
  Run your dev server and press C to comment.
`);
    }
  } else {
    console.log("\n  Done! Add remarq to your app and run your dev server.\n");
  }
}


// ── remarq remove ────────────────────────────────────────────

async function remove() {
  const cwd = process.cwd();
  console.log("\n  Removing remarq...\n");

  const routePaths = [
    path.join(cwd, "src", "app", "api", "remarq"),
    path.join(cwd, "app", "api", "remarq"),
  ];
  for (const p of routePaths) {
    try {
      await fs.rm(p, { recursive: true });
      console.log("  ✓ Removed api/remarq/ route");
    } catch {}
  }

  // Clean gitignore
  const gitignorePath = path.join(cwd, ".gitignore");
  try {
    let content = await fs.readFile(gitignorePath, "utf-8");
    content = content.replace(/\n# Remarq[^\n]*\n[^\n]*\n?/g, "\n");
    content = content.replace(/\n# Remarq[^\n]*\n/g, "\n");
    await fs.writeFile(gitignorePath, content, "utf-8");
    console.log("  ✓ Cleaned .gitignore");
  } catch {}

  console.log(`
  Done. You can also:
  - Remove .remarq/ directory (deletes all comments)
  - Remove remarq imports from your layout
  - Run: npm uninstall remarq
`);
}

// ── Helpers ──────────────────────────────────────────────────

async function detectFramework(cwd: string): Promise<string | null> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps["next"]) return "nextjs";
    return null;
  } catch {
    return null;
  }
}

async function checkDependency(cwd: string): Promise<boolean> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return !!deps["remarq"];
  } catch {
    return false;
  }
}

async function updateGitignore(cwd: string, mode: Mode) {
  const gitignorePath = path.join(cwd, ".gitignore");
  let content = "";
  try { content = await fs.readFile(gitignorePath, "utf-8"); } catch {}

  // Remove any existing remarq entries
  content = content.replace(/\n# Remarq[^\n]*\n[^\n]*\n?/g, "\n");

  // Add based on mode
  switch (mode) {
    case "dev":
      // Ignore comments, keep route
      if (!content.includes(".remarq/")) {
        content += "\n# Remarq comments (local only)\n.remarq/\n";
      }
      console.log("  ✓ .remarq/ added to .gitignore (comments are local)");
      break;

    case "personal":
      // Ignore everything
      if (!content.includes(".remarq/")) {
        content += "\n# Remarq (personal mode)\n.remarq/\napp/api/remarq/\nsrc/app/api/remarq/\n";
      }
      console.log("  ✓ .remarq/ and api route added to .gitignore (fully private)");
      break;

    case "public":
      // Don't ignore anything — comments are shared
      console.log("  · .remarq/ will be committed to git (public mode)");
      break;
  }

  await fs.writeFile(gitignorePath, content, "utf-8");
}

async function createWrapper(cwd: string, mode: Mode): Promise<boolean> {
  const dirs = [
    path.join(cwd, "src", "components"),
    path.join(cwd, "components"),
  ];
  let compDir: string | null = null;
  for (const d of dirs) {
    try { await fs.access(d); compDir = d; break; } catch {}
  }
  if (!compDir) {
    compDir = path.join(cwd, "src", "components");
    await fs.mkdir(compDir, { recursive: true });
  }

  const wrapperFile = path.join(compDir, "remarq-wrapper.tsx");
  try {
    await fs.access(wrapperFile);
    return false;
  } catch {
    // Environment guard based on mode
    const envGuard = mode === "public"
      ? `// Public mode: remarq runs in all environments
  const enabled = process.env.NEXT_PUBLIC_REMARQ !== "false";`
      : mode === "personal"
      ? `// Personal mode: only runs locally
  const enabled = process.env.NODE_ENV === "development" && !process.env.CI;`
      : `// Dev mode: runs in development and staging
  const enabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_REMARQ === "true";`;

    await fs.writeFile(wrapperFile, `"use client";

import { RemarqProvider, CommentOverlay, CommentToggle, CommentSidebar } from "remarq";
import { usePathname } from "next/navigation";

export function RemarqWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  ${envGuard}

  if (!enabled) return <>{children}</>;

  return (
    <RemarqProvider pageId={pathname}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {children}
        <CommentOverlay />
        <CommentSidebar />
        <CommentToggle />
      </div>
    </RemarqProvider>
  );
}
`, "utf-8");
    console.log("  ✓ Created components/remarq-wrapper.tsx");
    return true;
  }
}

async function setupNextjs(cwd: string): Promise<boolean> {
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
      console.log("  · Could not find app/ directory");
      return false;
    }
  }

  await fs.mkdir(routeDir, { recursive: true });
  const routeFile = path.join(routeDir, "route.ts");

  try {
    await fs.access(routeFile);
    return false;
  } catch {
    await fs.writeFile(routeFile, `export { GET, POST } from "remarq/adapters/nextjs";\n`, "utf-8");
    console.log("  ✓ Created api/remarq/route.ts");
    return true;
  }
}
