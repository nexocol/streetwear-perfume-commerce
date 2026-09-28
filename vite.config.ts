import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const previewNoIndex = env.VITE_PREVIEW_NOINDEX !== 'false'
  const robotsMetaValue = previewNoIndex ? 'noindex,nofollow,noarchive,nosnippet' : 'index,follow'
  let outDir = resolve(process.cwd(), 'dist')
  return {
    plugins: [
      react(),
      {
        name: 'preview-robots',
        configResolved(config) { outDir = config.build.outDir },
        // Bakes the same build-time previewNoIndex value into the initial HTML bytes, so the
        // first response never ships noindex when VITE_PREVIEW_NOINDEX=false — no reliance on
        // SeoGuard's client-side correction, which remains only as a runtime safety layer.
        transformIndexHtml(html) {
          return html
            .replace(/(<meta name="robots" content=")[^"]*("\s*id="robots-meta">)/, `$1${robotsMetaValue}$2`)
            .replace(/(<meta name="googlebot" content=")[^"]*("\s*id="googlebot-meta">)/, `$1${robotsMetaValue}$2`)
        },
        closeBundle() {
          const robots = previewNoIndex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
          const headers = previewNoIndex ? '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n' : '/*\n  X-Content-Type-Options: nosniff\n'
          writeFileSync(resolve(outDir, 'robots.txt'), robots)
          writeFileSync(resolve(outDir, '_headers'), headers)
        },
      },
    ],
    build: {
      target: 'es2022',
      sourcemap: false,
      cssCodeSplit: true,
    },
  }
})
