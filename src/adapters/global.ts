/**
 * Global storage adapter for cross-project comment management.
 * Stores comments in ~/.remarq/{projectId}/{pageId}.json
 *
 * Usage:
 *   import { createGlobalAdapter } from "remarq/adapters/global";
 *   const storage = createGlobalAdapter("my-project");
 *
 * For Next.js API route:
 *   import { createGlobalHandler } from "remarq/adapters/global";
 *   const { GET, POST } = createGlobalHandler("my-project");
 *   export { GET, POST };
 */

export function createGlobalHandler(projectId: string) {
  return {
    async GET(request: Request) {
      const { promises: fs } = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const url = new URL(request.url);
      const pageId = url.searchParams.get("pageId");
      if (!pageId) return Response.json({ error: "Missing pageId" }, { status: 400 });

      const dir = path.join(os.homedir(), ".remarq", projectId.replace(/[^a-zA-Z0-9_-]/g, ""));
      const safeName = pageId.replace(/[^a-zA-Z0-9_-]/g, "");
      const file = path.join(dir, `${safeName}.json`);

      try {
        const data = await fs.readFile(file, "utf-8");
        return Response.json(JSON.parse(data));
      } catch {
        return Response.json([]);
      }
    },

    async POST(request: Request) {
      const { promises: fs } = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const url = new URL(request.url);
      const pageId = url.searchParams.get("pageId");
      if (!pageId) return Response.json({ error: "Missing pageId" }, { status: 400 });

      const dir = path.join(os.homedir(), ".remarq", projectId.replace(/[^a-zA-Z0-9_-]/g, ""));
      const safeName = pageId.replace(/[^a-zA-Z0-9_-]/g, "");
      const file = path.join(dir, `${safeName}.json`);

      try {
        await fs.mkdir(dir, { recursive: true });
        const threads = await request.json();
        await fs.writeFile(file, JSON.stringify(threads, null, 2), "utf-8");
        return Response.json({ ok: true });
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 });
      }
    },
  };
}
