import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "adapters/localStorage": "src/adapters/localStorage.ts",
    "adapters/rest": "src/adapters/rest.ts",
    "adapters/nextjs": "src/adapters/nextjs.ts",
    "adapters/global": "src/adapters/global.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  banner: {
    // Preserve "use client" directives for React Server Components
    js: '"use client";',
  },
});
