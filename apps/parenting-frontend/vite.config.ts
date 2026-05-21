import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// packages/ui declares `react` as a peer dep with `*`, which makes pnpm
// auto-install React 19 next to it (mobile uses 19). When imports flow
// through @parenting/ui, Vite would resolve to that React 19 while the app
// itself uses React 18 — two Reacts, broken hooks. Force every `react` /
// `react-dom` import to this app's copy.
const reactPath = path.resolve(__dirname, 'node_modules/react');
const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');

/** Serve `/sitemap.xml` in dev (build writes it to `dist/`; dev has no dist until build). */
function sitemapDevPlugin(): Plugin {
  return {
    name: 'sitemap-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== '/sitemap.xml') {
          next();
          return;
        }
        const env = loadEnv(server.config.mode, process.cwd(), '');
        const port = server.config.server.port ?? 5173;
        const siteBaseUrl = (
          env.VITE_SITEMAP_BASE_URL || `http://localhost:${port}`
        ).replace(/\/+$/, '');
        const apiBaseUrl = env.VITE_API_URL || 'http://localhost:4000';
        try {
          const { buildSitemapXml } = await import('./scripts/sitemap-core.mjs');
          const xml = await buildSitemapXml({ siteBaseUrl, apiBaseUrl });
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.end(xml);
        } catch (err) {
          console.error('[sitemap-dev]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Sitemap generation failed');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    sitemapDevPlugin(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['logo.png', 'archive.png'],
      manifest: {
        name: 'Raised — Science-backed Parenting',
        short_name: 'Raised',
        description: 'Your family hub for science-backed parenting. AI assistant, calendar, moments, and more.',
        theme_color: '#F8F9FE',
        background_color: '#F8F9FE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['lifestyle', 'health', 'education'],
        icons: [
          {
            src: '/logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        // Serve the service worker in dev so push registration works.
        // `type: 'module'` is required by injectManifest because src/sw.ts
        // uses ES imports (workbox-*).
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
    // Sourcemap upload reads SENTRY_ORG, SENTRY_PROJECT, SENTRY_URL,
    // SENTRY_AUTH_TOKEN, and SENTRY_RELEASE from the environment at build
    // time (set on Coolify with is_buildtime: true). SENTRY_RELEASE is set
    // per-deploy to the commit SHA by the deploy workflow. Without the auth
    // token the plugin emits sourcemaps but skips upload silently, so local
    // builds still work. sourcemaps.filesToDeleteAfterUpload keeps the maps
    // out of the public bundle.
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      url: process.env.SENTRY_URL,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.SENTRY_RELEASE },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
      silent: true,
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  resolve: {
    alias: {
      react: reactPath,
      'react-dom': reactDomPath,
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Function form: route any nested import to a single home so shared deps
        // (react, scheduler) are not duplicated into vendor-sentry / vendor-motion.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@sentry/')) return 'vendor-sentry';
          if (id.includes('node_modules/framer-motion/')) return 'vendor-motion';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
