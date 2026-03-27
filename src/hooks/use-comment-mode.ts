"use client";

import { useRemarq } from "../context";

export function useCommentMode() {
  const { commentMode, setCommentMode, sidebarOpen, setSidebarOpen } = useRemarq();

  return {
    commentMode,
    setCommentMode,
    toggleCommentMode: () => setCommentMode(!commentMode),
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar: () => setSidebarOpen(!sidebarOpen),
  };
}
