import type { RemarqStorage, RemarqThread } from "../types";

const STORAGE_PREFIX = "remarq-";

export const localStorageAdapter: RemarqStorage = {
  async load(pageId: string): Promise<RemarqThread[]> {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${pageId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async save(pageId: string, threads: RemarqThread[]): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${STORAGE_PREFIX}${pageId}`, JSON.stringify(threads));
  },
};
