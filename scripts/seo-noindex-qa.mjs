// V4.6D: proves the build-time robots/noindex output is correct in BOTH modes.
// Builds twice to the real dist/ (matching exactly how deploy builds work), copying each
// result out to a temp dir before the next build overwrites it.
//   node scripts/seo-noindex-qa.mjs
import { execSync } from 'node:child_process'
import { readFileSync, rmSync, mkdtempSync, cpSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const distDir = path.join(root, 'dist')
let failures = 0
const check = (ok, name, extra = '') => { console.log((ok ? 'PASS: ' : 'FAIL: ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++ }

function buildAndCapture(envValue, captureDir) {
  execSync('npx vite build', { cwd: root, env: { ...process.env, VITE_PREVIEW_NOINDEX: envValue }, stdio: 'pipe' })
  cpSync(distDir, captureDir, { recursive: true })
}

const work = mkdtempSync(path.join(tmpdir(), 'v46d-seo-qa-'))
const prodDir = path.join(work, 'prod')
const previewDir = path.join(work, 'preview')

try {
  console.log('== production build (VITE_PREVIEW_NOINDEX=false) ==')
  buildAndCapture('false', prodDir)
  const prodHtml = readFileSync(path.join(prodDir, 'index.html'), 'utf8')
  check(!/noindex/i.test(prodHtml), 'production: index.html has no "noindex"')
  check(!/nofollow/i.test(prodHtml), 'production: index.html has no "nofollow"')
  check(!/noarchive/i.test(prodHtml), 'production: index.html has no "noarchive"')
  check(!/nosnippet/i.test(prodHtml), 'production: index.html has no "nosnippet"')
  check(/<meta name="robots" content="index,follow" id="robots-meta">/.test(prodHtml), 'production: robots meta = index,follow')
  check(/<meta name="googlebot" content="index,follow" id="googlebot-meta">/.test(prodHtml), 'production: googlebot meta = index,follow')
  check(existsSync(path.join(prodDir, 'robots.txt')), 'production: robots.txt exists')
  const prodRobots = readFileSync(path.join(prodDir, 'robots.txt'), 'utf8')
  check(/^Allow: \/$/m.test(prodRobots), 'production: robots.txt allows crawling', JSON.stringify(prodRobots))
  const prodHeaders = readFileSync(path.join(prodDir, '_headers'), 'utf8')
  check(!/X-Robots-Tag/i.test(prodHeaders), 'production: _headers has no X-Robots-Tag', JSON.stringify(prodHeaders))

  console.log('\n== preview build (VITE_PREVIEW_NOINDEX=true) ==')
  buildAndCapture('true', previewDir)
  const previewHtml = readFileSync(path.join(previewDir, 'index.html'), 'utf8')
  check(/<meta name="robots" content="noindex,nofollow,noarchive,nosnippet" id="robots-meta">/.test(previewHtml), 'preview: robots meta = full noindex directive')
  check(/<meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet" id="googlebot-meta">/.test(previewHtml), 'preview: googlebot meta = full noindex directive')
  const previewRobots = readFileSync(path.join(previewDir, 'robots.txt'), 'utf8')
  check(/^Disallow: \/$/m.test(previewRobots), 'preview: robots.txt disallows crawling', JSON.stringify(previewRobots))
  const previewHeaders = readFileSync(path.join(previewDir, '_headers'), 'utf8')
  check(/X-Robots-Tag: noindex, nofollow, noarchive/.test(previewHeaders), 'preview: _headers contains X-Robots-Tag noindex', JSON.stringify(previewHeaders))
} catch (e) {
  console.error('QA crashed:', e)
  failures++
} finally {
  try { rmSync(work, { recursive: true, force: true }) } catch {}
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll SEO noindex checks passed')
process.exit(failures ? 1 : 0)
