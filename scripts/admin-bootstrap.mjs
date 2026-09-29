// V4.9: creates the two application admin accounts in D1 without any credential ever entering git.
//
//   ADMIN_CLIENT_TEMP_PASSWORD='...' node scripts/admin-bootstrap.mjs --remote --demo-password-file <path outside the repo>
//
// - client  "administrador": created once with must_change_password=1. Re-running NEVER touches an existing account,
//   so a password the client already chose cannot be overwritten. --reset-client is the explicit escape hatch.
// - demo    "nexo-demo": created once with a random password written ONLY to --demo-password-file (never printed).
//   --rotate-demo issues a new one. ADMIN_DEMO_PASSWORD may supply a fixed value (used by the local test server).
// Apply migrations/0003_admin_auth.sql first with `d1 execute` (never `migrations apply --remote`).
import { spawnSync } from 'node:child_process'
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const ITERATIONS = 100_000 // must match PBKDF2_ITERATIONS in src/server/adminAuth.ts
const DB = 'streetwear-perfume-commerce-db'
const args = process.argv.slice(2)
const flag = name => args.includes(name)
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const target = flag('--remote') ? '--remote' : flag('--local') ? '--local' : null
if (!target) { console.error('Indica --remote o --local.'); process.exit(2) }
const persist = option('--persist-to')
const config = option('--config') || 'wrangler.v3.jsonc'
const demoFile = option('--demo-password-file')

const clientPassword = process.env.ADMIN_CLIENT_TEMP_PASSWORD
if (!clientPassword || clientPassword.length < 8) { console.error('ADMIN_CLIENT_TEMP_PASSWORD (mínimo 8 caracteres) debe estar en el entorno.'); process.exit(2) }

function wrangler(extra) {
  const cli = [path.join(process.cwd(), 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', DB, target, ...extra, '-c', config, '--json']
  if (target === '--local' && persist) cli.push('--persist-to', persist)
  const r = spawnSync(process.execPath, cli, { encoding: 'utf8', maxBuffer: 1e8, shell: false })
  if (r.status !== 0) throw new Error('wrangler d1 execute failed: ' + (r.stdout || '') + (r.stderr || ''))
  return r.stdout
}
function existingUsernames() {
  const out = wrangler(['--command', 'SELECT username FROM admin_users'])
  return new Set(JSON.parse(out.slice(out.indexOf('[')))[0].results.map(row => row.username))
}
// --command (not --file): the file path uses D1's import flow, which can pause a live database; statements here are tiny.
function execute(sql) { wrangler(['--command', sql]) }
function hash(password) {
  const salt = randomBytes(16)
  return { salt: salt.toString('base64'), hash: pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('base64') }
}
const q = value => "'" + String(value).replace(/'/g, "''") + "'"
// Base64 hashes/salts contain no quotes; usernames and roles are fixed constants.
function writeUser({ username, role, password, mustChange }) {
  const h = hash(password)
  return `INSERT INTO admin_users(id,username,role,password_hash,password_salt,password_iterations,must_change_password) VALUES(${q(randomUUID())},${q(username)},${q(role)},${q(h.hash)},${q(h.salt)},${ITERATIONS},${mustChange ? 1 : 0}) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash,password_salt=excluded.password_salt,password_iterations=excluded.password_iterations,must_change_password=excluded.must_change_password,updated_at=CURRENT_TIMESTAMP;
DELETE FROM admin_sessions WHERE user_id=(SELECT id FROM admin_users WHERE username=${q(username)});
DELETE FROM admin_login_attempts WHERE key LIKE ${q('u:%:' + username)};`
}

const existing = existingUsernames()
const statements = []
const report = []

if (!existing.has('administrador') || flag('--reset-client')) {
  statements.push(writeUser({ username: 'administrador', role: 'client', password: clientPassword, mustChange: true }))
  report.push(existing.has('administrador') ? 'administrador: RESTABLECIDO (contraseña temporal, cambio obligatorio)' : 'administrador: creado (contraseña temporal, cambio obligatorio)')
} else report.push('administrador: ya existe, sin cambios')

let demoPassword = null
if (!existing.has('nexo-demo') || flag('--rotate-demo')) {
  demoPassword = process.env.ADMIN_DEMO_PASSWORD
  if (!demoPassword) {
    if (!demoFile) { console.error('Sin ADMIN_DEMO_PASSWORD debes indicar --demo-password-file para no imprimir la contraseña.'); process.exit(2) }
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    demoPassword = Array.from(randomBytes(20), b => alphabet[b % alphabet.length]).join('')
  }
  statements.push(writeUser({ username: 'nexo-demo', role: 'demo', password: demoPassword, mustChange: false }))
  report.push(existing.has('nexo-demo') ? 'nexo-demo: contraseña rotada' : 'nexo-demo: creado')
} else report.push('nexo-demo: ya existe, sin cambios')

if (statements.length) execute(statements.join('\n'))
if (demoPassword && demoFile) writeFileSync(demoFile, demoPassword + '\n', { mode: 0o600 })
console.log(`OK ${target}\n` + report.map(line => ' - ' + line).join('\n'))
if (demoPassword && demoFile) console.log(`La contraseña demo NO se imprime; quedó en ${demoFile}`)
