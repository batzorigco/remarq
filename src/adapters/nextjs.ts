/**
 * Next.js API route handler for remarq comment storage.
 * Stores comments as JSON files on the server filesystem.
 *
 * Usage in your Next.js app:
 *
 * // app/api/comments/route.ts
 * export { GET, POST } from "remarq/adapters/nextjs";
 *
 * Or with custom directory:
 * import { createNextjsHandler } from "remarq/adapters/nextjs";
 * const { GET, POST } = createNextjsHandler(".my-comments");
 * export { GET, POST };
 */

export function createNextjsHandler(directory: string = ".comments") {
  // Dynamic import to avoid bundling node modules in client
  return {
    async GET(request: Request) {
      const { promises: fs } = await import("fs");
      const path = await import("path");

      const url = new URL(request.url);
      const pageId = url.searchParams.get("pageId");
      if (!pageId) {
        return Response.json({ error: "Missing pageId" }, { status: 400 });
      }

      const dir = path.join(process.cwd(), directory);
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

      const url = new URL(request.url);
      const pageId = url.searchParams.get("pageId");
      if (!pageId) {
        return Response.json({ error: "Missing pageId" }, { status: 400 });
      }

      const dir = path.join(process.cwd(), directory);
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

// Default handler with ".comments" directory
const defaultHandler = createNextjsHandler();
export const GET = defaultHandler.GET;
export const POST = defaultHandler.POST;
