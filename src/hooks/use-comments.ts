"use client";

import { useRemarq } from "../context";

export function useComments() {
  const { threads, addThread, addReply, resolveThread, deleteThread, unresolvedCount } = useRemarq();

  return {
    threads,
    openThreads: threads.filter((t) => !t.resolved),
    resolvedThreads: threads.filter((t) => t.resolved),
    addThread,
    addReply,
    resolveThread,
    deleteThread,
    unresolvedCount,
  };
}
