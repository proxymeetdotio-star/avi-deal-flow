import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Build as a static SPA (Single Page Application) for GitHub Pages
  // Disable SSR by not specifying tanstackStart
  vite: {
    // Ensure we're not building SSR
    ssr: undefined,
  },
});
