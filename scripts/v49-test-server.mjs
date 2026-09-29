// V4.9 test server: the real Worker + built ./dist against a throwaway local D1.
// Uses the same migration file and bootstrap script that production uses. Run `npm run build` first.
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = process.cwd()
const persist = mkdtempSync(path.join(tmpdir(), 'ep-v49-'))
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js')
const config = 'wrangler.v3.jsonc'

function run(args, env = {}) {
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })
  if (r.status !== 0) process.exit(r.status || 1)
}
// Commerce tables are created lazily by the Worker; the auth tables come from the real, deliberate migration.
run([wrangler, 'd1', 'execute', 'streetwear-perfume-commerce-db', '--local', '--persist-to', persist, '--file', 'migrations/0003_admin_auth.sql', '-c', config])
run(['scripts/admin-bootstrap.mjs', '--local', '--persist-to', persist], {
  ADMIN_CLIENT_TEMP_PASSWORD: process.env.V49_CLIENT_TEMP,
  ADMIN_DEMO_PASSWORD: process.env.V49_DEMO_PASSWORD,
})

const dev = spawn(process.execPath, [wrangler, 'dev', '-c', config, '--local', '--port', '8799', '--ip', '127.0.0.1', '--inspector-port', '9339', '--persist-to', persist], { cwd: root, stdio: 'inherit' })
dev.on('exit', code => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => dev.kill())
