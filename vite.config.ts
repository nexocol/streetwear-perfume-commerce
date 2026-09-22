import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const previewNoIndex = env.VITE_PREVIEW_NOINDEX !== 'false'
  return {
    plugins: [
      react(),
      {
        name: 'preview-robots',
        closeBundle() {
          const out = resolve(process.cwd(), 'dist')
          const robots = previewNoIndex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
          const headers = previewNoIndex ? '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n' : '/*\n  X-Content-Type-Options: nosniff\n'
          writeFileSync(resolve(out, 'robots.txt'), robots)
          writeFileSync(resolve(out, '_headers'), headers)
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
