import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  plugins: [
    VitePWA({
      /* Use the plugin's generated SW (replaces public/sw.js) */
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'script',

      /* Point at the existing manifest */
      manifest: false,
      manifestFilename: 'manifest.json',

      workbox: {
        /* Precache ALL build outputs (JS, CSS, HTML, icons) */
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],

        /* Cache-first for everything — game has no server data */
        runtimeCaching: [],

        /* Activate new SW immediately without waiting */
        skipWaiting: true,
        clientsClaim: true,

        /* Increase limit — Phaser bundle is large (~2 MB) */
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ]
});
