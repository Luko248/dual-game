import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Mobile (iOS/Android wrapper) build.
 *
 * Emits ONE self-contained HTML file — every JS/CSS chunk is inlined — because
 * the Expo shell loads the game from a local asset inside a WKWebView, where
 * multi-file file:// sites and service workers are unreliable. The game has no
 * external assets (synth audio, inline SVG), so a single file loses nothing.
 *
 * No PWA plugin here: the service worker is a web-only concern and
 * navigator.serviceWorker is unavailable on file:// origins anyway.
 */
export default defineConfig({
  root: '.',
  publicDir: false,
  base: './',
  build: {
    outDir: 'mobile/assets/game',
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000
  },
  plugins: [viteSingleFile()]
});
