"use client";

import { X, Check, Undo2, MessageSquare } from "lucide-react";
import { useRemarq } from "../context";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentSidebar() {
  const {
    threads,
    sidebarOpen,
    setSidebarOpen,
    setActiveThreadId,
    resolveThread,
  } = useRemarq();

  if (!sidebarOpen) return null;

  const openThreads = threads.filter((t) => !t.resolved);
  const resolvedThreads = threads.filter((t) => t.resolved);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 z-[75] bg-white border-l border-neutral-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-neutral-500" />
          <span className="text-sm font-semibold text-neutral-900">
            Comments
          </span>
          {openThreads.length > 0 && (
            <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full">
              {openThreads.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded hover:bg-neutral-100 transition-colors"
        >
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <div className="p-6 text-center text-sm text-neutral-400">
            No comments yet.
          </div>
        )}

        {openThreads.length > 0 && (
          <div>
            <div className="px-4 py-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Open ({openThreads.length})
            </div>
            {openThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                onSelect={() => {
                  setActiveThreadId(thread.id);
                }}
                onResolve={() => resolveThread(thread.id)}
              />
            ))}
          </div>
        )}

        {resolvedThreads.length > 0 && (
          <div>
            <div className="px-4 py-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Resolved ({resolvedThreads.length})
            </div>
            {resolvedThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                onSelect={() => {
                  setActiveThreadId(thread.id);
                }}
                onResolve={() => resolveThread(thread.id)}
                resolved
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadItem({
  thread,
  onSelect,
  onResolve,
  resolved,
}: {
  thread: { id: string; targetLabel?: string; comments: { author: { name: string; color: string }; body: string; createdAt: string }[] };
  onSelect: () => void;
  onResolve: () => void;
  resolved?: boolean;
}) {
  const firstComment = thread.comments[0];
  if (!firstComment) return null;

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 border-b border-neutral-50 cursor-pointer hover:bg-neutral-50 transition-colors
        ${resolved ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-semibold"
            style={{ backgroundColor: firstComment.author.color }}
          >
            {firstComment.author.name[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-medium text-neutral-700">
            {firstComment.author.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-neutral-400">
            {timeAgo(firstComment.createdAt)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
            }}
            className="p-0.5 rounded hover:bg-neutral-200 transition-colors"
          >
            {resolved ? (
              <Undo2 className="w-3 h-3 text-neutral-400" />
            ) : (
              <Check className="w-3 h-3 text-emerald-600" />
            )}
          </button>
        </div>
      </div>
      {thread.targetLabel && (
        <span className="inline-block text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium ml-6 mb-1">
          {thread.targetLabel}
        </span>
      )}
      <p className="text-xs text-neutral-600 line-clamp-2 pl-6">
        {firstComment.body}
      </p>
      {thread.comments.length > 1 && (
        <span className="text-[10px] text-neutral-400 pl-6">
          {thread.comments.length - 1} {thread.comments.length - 1 === 1 ? "reply" : "replies"}
        </span>
      )}
    </div>
  );
}
