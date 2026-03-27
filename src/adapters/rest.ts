import type { RemarqStorage, RemarqThread } from "../types";

/**
 * REST API storage adapter.
 * Works with any backend that implements GET/POST for threads.
 */
export function createRestAdapter(baseUrl: string): RemarqStorage {
  return {
    async load(pageId: string): Promise<RemarqThread[]> {
      try {
        const res = await fetch(`${baseUrl}?pageId=${encodeURIComponent(pageId)}`);
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    },

    async save(pageId: string, threads: RemarqThread[]): Promise<void> {
      try {
        await fetch(`${baseUrl}?pageId=${encodeURIComponent(pageId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(threads),
        });
      } catch {
        // silent fail
      }
    },
  };
}
