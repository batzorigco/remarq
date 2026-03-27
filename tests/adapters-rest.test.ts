import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRestAdapter } from "../src/adapters/rest";
import type { ApostilThread } from "../src/types";

const mockThread: ApostilThread = {
  id: "t1",
  pageId: "home",
  pinX: 50,
  pinY: 30,
  resolved: false,
  comments: [
    {
      id: "c1",
      threadId: "t1",
      author: { id: "u1", name: "Alice", color: "#f00" },
      body: "Test comment",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
  createdAt: "2026-01-01T00:00:00Z",
};

describe("createRestAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("load", () => {
    it("fetches threads from correct URL", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify([mockThread]), { status: 200 })
      );

      const adapter = createRestAdapter("/api/comments");
      const result = await adapter.load("home");

      expect(fetchSpy).toHaveBeenCalledWith("/api/comments?pageId=home");
      expect(result).toEqual([mockThread]);
    });

    it("encodes pageId in URL", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("[]", { status: 200 })
      );

      const adapter = createRestAdapter("/api/comments");
      await adapter.load("page--with--dashes");

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/comments?pageId=page--with--dashes"
      );
    });

    it("returns empty array on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Not found", { status: 404, statusText: "Not Found" })
      );

      const adapter = createRestAdapter("/api/comments");
      const result = await adapter.load("missing");
      expect(result).toEqual([]);
    });

    it("returns empty array on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const adapter = createRestAdapter("/api/comments");
      const result = await adapter.load("home");
      expect(result).toEqual([]);
    });
  });

  describe("save", () => {
    it("posts threads to correct URL", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response('{"ok":true}', { status: 200 })
      );

      const adapter = createRestAdapter("/api/comments");
      await adapter.save("home", [mockThread]);

      expect(fetchSpy).toHaveBeenCalledWith("/api/comments?pageId=home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([mockThread]),
      });
    });

    it("does not throw on save failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Error", { status: 500, statusText: "Internal Server Error" })
      );

      const adapter = createRestAdapter("/api/comments");
      await expect(adapter.save("home", [mockThread])).resolves.not.toThrow();
    });

    it("does not throw on network error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const adapter = createRestAdapter("/api/comments");
      await expect(adapter.save("home", [mockThread])).resolves.not.toThrow();
    });
  });
});
