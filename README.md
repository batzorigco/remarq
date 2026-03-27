# Remarq

Pin-and-comment feedback overlay for design prototypes and web apps. Drop it into any React app to let your team leave contextual feedback directly on the UI.

## Features

- **Click to pin** — drop comment pins anywhere on the page
- **Smart target detection** — auto-anchors to nearest meaningful element (sections, panels, scrollable areas)
- **Thread-based** — replies, resolve/unresolve, delete
- **Keyboard shortcut** — press `C` to toggle comment mode
- **Pluggable storage** — localStorage, REST API, Next.js filesystem, or bring your own
- **Zero styling dependencies** — all UI built with Tailwind CSS classes
- **SSR-safe** — works with React Server Components (Next.js App Router)

## Install

```bash
npm install remarq
```

## Quick Start

```tsx
import { RemarqProvider, CommentOverlay, CommentToggle, CommentSidebar } from "remarq";

function App() {
  return (
    <RemarqProvider pageId="my-page">
      <div className="relative">
        {/* Your app content */}
        <YourApp />

        {/* Remarq components */}
        <CommentOverlay />
        <CommentSidebar />
        <CommentToggle />
      </div>
    </RemarqProvider>
  );
}
```

That's it. Press `C` to start commenting.

## Storage Adapters

### localStorage (default)

Comments persist in the browser. Good for personal use and prototyping.

```tsx
// This is the default — no config needed
<RemarqProvider pageId="my-page">
```

### REST API

Point to any backend that accepts GET/POST:

```tsx
import { createRestAdapter } from "remarq/adapters/rest";

const storage = createRestAdapter("/api/comments");

<RemarqProvider pageId="my-page" storage={storage}>
```

Your backend should implement:
- `GET /api/comments?pageId=my-page` → returns `RemarqThread[]`
- `POST /api/comments?pageId=my-page` → body is `RemarqThread[]`

### Next.js Filesystem

Stores comments as JSON files in your project (committable to git):

```tsx
// 1. Create the API route
// app/api/comments/route.ts
export { GET, POST } from "remarq/adapters/nextjs";

// 2. Use the REST adapter pointing to your route
import { createRestAdapter } from "remarq/adapters/rest";

<RemarqProvider pageId="my-page" storage={createRestAdapter("/api/comments")}>
```

Comments save to `.comments/{pageId}.json` in your project root.

### Custom Adapter

Implement the `RemarqStorage` interface:

```tsx
import type { RemarqStorage } from "remarq";

const myAdapter: RemarqStorage = {
  async load(pageId) {
    // Fetch threads from your database
    return await db.getComments(pageId);
  },
  async save(pageId, threads) {
    // Persist threads to your database
    await db.saveComments(pageId, threads);
  },
};

<RemarqProvider pageId="my-page" storage={myAdapter}>
```

## Components

### RemarqProvider

Wraps your app. Manages comment state and persistence.

```tsx
<RemarqProvider
  pageId="unique-page-id"  // Namespace for comments
  storage={adapter}         // Optional storage adapter (default: localStorage)
>
```

### CommentOverlay

Transparent overlay that captures clicks in comment mode. Renders pins and thread popovers.

### CommentToggle

Floating action button (bottom-right) to toggle comment mode and sidebar. Shows unresolved count badge.

### CommentSidebar

Right panel listing all comment threads grouped by open/resolved.

## Hooks

### useRemarq()

Full context access:

```tsx
const {
  threads,           // All threads
  user,              // Current user
  commentMode,       // Is comment mode active
  activeThreadId,    // Which thread popover is open
  sidebarOpen,       // Is sidebar visible
  addThread,         // Create new thread
  addReply,          // Reply to thread
  resolveThread,     // Toggle resolved
  deleteThread,      // Remove thread
  setUser,           // Set user name
  unresolvedCount,   // Count of open threads
} = useRemarq();
```

### useComments()

Thread operations:

```tsx
const { threads, openThreads, resolvedThreads, addThread, addReply, resolveThread, deleteThread, unresolvedCount } = useComments();
```

### useCommentMode()

Toggle state:

```tsx
const { commentMode, toggleCommentMode, sidebarOpen, toggleSidebar } = useCommentMode();
```

## Target Detection

When placing a comment, Remarq walks up the DOM to find the nearest meaningful container:

1. `data-comment-target="id"` — explicit anchor (highest priority)
2. Elements with `id`
3. Elements with `aria-label`
4. Elements with `role`
5. Semantic HTML (`section`, `nav`, `aside`, etc.)
6. Visual panels (scrollable, bordered, shadowed elements)

Pin coordinates are stored as percentages relative to the target element, so they follow the element on scroll/resize.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Toggle comment mode |
| `Escape` | Cancel comment / exit comment mode |
| `Enter` | Submit comment (in composer) |

## Types

```tsx
type RemarqThread = {
  id: string;
  pageId: string;
  pinX: number;        // % position (0-100)
  pinY: number;        // % position (0-100)
  targetId?: string;   // CSS selector or data-comment-target value
  targetLabel?: string;
  resolved: boolean;
  comments: RemarqComment[];
  createdAt: string;
};

type RemarqComment = {
  id: string;
  threadId: string;
  author: RemarqUser;
  body: string;
  createdAt: string;
};

type RemarqUser = {
  id: string;
  name: string;
  avatar?: string;
  color: string;
};

type RemarqStorage = {
  load(pageId: string): Promise<RemarqThread[]>;
  save(pageId: string, threads: RemarqThread[]): Promise<void>;
};
```

## Requirements

- React 18+
- Tailwind CSS (for component styling)
- lucide-react (icons)

## License

MIT
