// V4.9 application-level admin auth (client panel + demo). Server-side only: sessions live in D1, the browser holds an opaque token.
// Independent of Cloudflare Access, which keeps guarding /admin and /api/admin/*.

export type AuthScope='panel'|'demo'
type Db={prepare:(sql:string)=>any}
export type AuthEnv={DB:Db}
export type SessionUser={id:string;username:string;role:string;mustChangePassword:boolean}

export const PBKDF2_ITERATIONS=100_000
export const MIN_PASSWORD_LENGTH=8
export const DEMO_MESSAGE='MODO DEMO — Los cambios no se guardan.'
const SESSION_TTL_MS=7*24*60*60*1000
const MAX_FAILURES=5
const LOCK_MS=5*60*1000
const GENERIC_LOGIN_ERROR='Usuario o contraseña incorrectos.'
const ROLE:Record<AuthScope,string>={panel:'client',demo:'demo'}
const COOKIE:Record<AuthScope,string>={panel:'ep_panel',demo:'ep_demo'}
// The cookie is only ever sent to its own API namespace, never to the storefront or /api/admin.
const COOKIE_PATH:Record<AuthScope,string>={panel:'/api/panel',demo:'/api/demo'}

const encoder=new TextEncoder()
const DUMMY_SALT=new Uint8Array(16)

function reply(data:unknown,status=200,headers:Record<string,string>={}){
  return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})
}
function toB64(bytes:Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function fromB64(text:string){const bin=atob(text);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
function toB64Url(bytes:Uint8Array){return toB64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function sameBytes(a:Uint8Array,b:Uint8Array){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0}

async function derive(password:string,salt:Uint8Array,iterations:number){
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt as BufferSource,iterations},key,256))
}
export async function hashPassword(password:string){
  const salt=crypto.getRandomValues(new Uint8Array(16))
  return {hash:toB64(await derive(password,salt,PBKDF2_ITERATIONS)),salt:toB64(salt),iterations:PBKDF2_ITERATIONS}
}
async function verifyPassword(password:string,stored:{hash:string;salt:string;iterations:number}){
  return sameBytes(await derive(password,fromB64(stored.salt),stored.iterations),fromB64(stored.hash))
}
async function sha256Hex(text:string){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('')
}

function readCookie(request:Request,name:string){
  for(const part of (request.headers.get('cookie')||'').split(';')){
    const at=part.indexOf('=');if(at>0&&part.slice(0,at).trim()===name)return part.slice(at+1).trim()
  }
  return null
}
function isHttps(request:Request){return new URL(request.url).protocol==='https:'}
function cookieHeader(scope:AuthScope,value:string,maxAgeSeconds:number,request:Request){
  return `${COOKIE[scope]}=${value}; Path=${COOKIE_PATH[scope]}; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isHttps(request)?'; Secure':''}`
}

async function createSession(env:AuthEnv,userId:string){
  const token=toB64Url(crypto.getRandomValues(new Uint8Array(32)))
  await env.DB.prepare('INSERT INTO admin_sessions(id,user_id,expires_at) VALUES(?,?,?)').bind(await sha256Hex(token),userId,new Date(Date.now()+SESSION_TTL_MS).toISOString()).run()
  return token
}
export async function getSessionUser(env:AuthEnv,request:Request,scope:AuthScope):Promise<SessionUser|null>{
  const token=readCookie(request,COOKIE[scope])
  if(!token||token.length<32||token.length>128)return null
  const row=await env.DB.prepare('SELECT u.id,u.username,u.role,u.must_change_password,s.expires_at FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.id=?').bind(await sha256Hex(token)).first()
  if(!row||row.role!==ROLE[scope]||String(row.expires_at)<=new Date().toISOString())return null
  return {id:row.id,username:row.username,role:row.role,mustChangePassword:Boolean(Number(row.must_change_password))}
}

function attemptKeys(scope:AuthScope,username:string,request:Request){
  return [`u:${scope}:${username.toLowerCase().slice(0,64)}`,`i:${scope}:${request.headers.get('cf-connecting-ip')||'unknown'}`]
}
async function isLocked(env:AuthEnv,keys:string[]){
  const now=new Date().toISOString()
  for(const key of keys){
    const row=await env.DB.prepare('SELECT locked_until FROM admin_login_attempts WHERE key=?').bind(key).first()
    if(row?.locked_until&&String(row.locked_until)>now)return true
  }
  return false
}
async function recordFailure(env:AuthEnv,keys:string[]){
  const now=new Date()
  for(const key of keys){
    const row=await env.DB.prepare('SELECT failures,locked_until FROM admin_login_attempts WHERE key=?').bind(key).first()
    const lockExpired=Boolean(row?.locked_until)&&String(row.locked_until)<=now.toISOString()
    const failures=(lockExpired?0:Number(row?.failures||0))+1
    const lockedUntil=failures>=MAX_FAILURES?new Date(now.getTime()+LOCK_MS).toISOString():null
    await env.DB.prepare('INSERT INTO admin_login_attempts(key,failures,locked_until,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until,updated_at=excluded.updated_at').bind(key,failures,lockedUntil,now.toISOString()).run()
  }
}
async function clearFailures(env:AuthEnv,keys:string[]){
  for(const key of keys)await env.DB.prepare('DELETE FROM admin_login_attempts WHERE key=?').bind(key).run()
}
// Counters exist for every username tried (so lock behaviour cannot reveal real accounts); drop stale ones so junk usernames cannot pile up.
async function pruneAttempts(env:AuthEnv){
  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE updated_at<?').bind(new Date(Date.now()-24*60*60*1000).toISOString()).run()
}

export async function handleLogin(request:Request,env:AuthEnv,scope:AuthScope){
  if(Number(request.headers.get('content-length')||0)>4096)return reply({error:GENERIC_LOGIN_ERROR},413)
  let body:any
  try{body=await request.json()}catch{return reply({error:GENERIC_LOGIN_ERROR},400)}
  const username=String(body?.username??'').trim().slice(0,64)
  const password=String(body?.password??'').slice(0,200)
  if(!username||!password)return reply({error:GENERIC_LOGIN_ERROR},401)
  const keys=attemptKeys(scope,username,request)
  if(await isLocked(env,keys))return reply({error:'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'},429,{'Retry-After':String(LOCK_MS/1000)})
  const user=await env.DB.prepare('SELECT id,username,password_hash,password_salt,password_iterations,must_change_password FROM admin_users WHERE lower(username)=lower(?) AND role=?').bind(username,ROLE[scope]).first()
  // Unknown users still pay for one derivation so response time does not reveal which usernames exist.
  const ok=user?await verifyPassword(password,{hash:user.password_hash,salt:user.password_salt,iterations:Number(user.password_iterations)}):(await derive(password,DUMMY_SALT,PBKDF2_ITERATIONS),false)
  if(!ok){await recordFailure(env,keys);await pruneAttempts(env);return reply({error:GENERIC_LOGIN_ERROR},401)}
  await clearFailures(env,keys);await pruneAttempts(env)
  const nowIso=new Date().toISOString()
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(nowIso).run()
  const token=await createSession(env,user.id)
  return reply({ok:true,username:user.username,mustChangePassword:Boolean(Number(user.must_change_password))},200,{'Set-Cookie':cookieHeader(scope,token,SESSION_TTL_MS/1000,request)})
}

export async function handleLogout(request:Request,env:AuthEnv,scope:AuthScope){
  const token=readCookie(request,COOKIE[scope])
  if(token)await env.DB.prepare('DELETE FROM admin_sessions WHERE id=?').bind(await sha256Hex(token)).run()
  return reply({ok:true},200,{'Set-Cookie':cookieHeader(scope,'',0,request)})
}

// Only the forced first-login change exists: the session that just proved the temporary password may replace it, nothing else.
export async function handleChangePassword(request:Request,env:AuthEnv,user:SessionUser){
  if(!user.mustChangePassword)return reply({error:'El cambio de contraseña no está disponible.'},403)
  let body:any
  try{body=await request.json()}catch{return reply({error:'Solicitud inválida.'},400)}
  const next=typeof body?.newPassword==='string'?body.newPassword:'';const confirm=typeof body?.confirmPassword==='string'?body.confirmPassword:''
  if(next.length<MIN_PASSWORD_LENGTH)return reply({error:`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`},400)
  if(next.length>200)return reply({error:'La contraseña es demasiado larga.'},400)
  if(next!==confirm)return reply({error:'Las contraseñas no coinciden.'},400)
  const current=await env.DB.prepare('SELECT password_hash,password_salt,password_iterations FROM admin_users WHERE id=?').bind(user.id).first()
  if(current&&await verifyPassword(next,{hash:current.password_hash,salt:current.password_salt,iterations:Number(current.password_iterations)}))return reply({error:'La nueva contraseña debe ser distinta de la temporal.'},400)
  const stored=await hashPassword(next)
  await env.DB.prepare('UPDATE admin_users SET password_hash=?,password_salt=?,password_iterations=?,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(stored.hash,stored.salt,stored.iterations,user.id).run()
  await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(user.id).run()
  const token=await createSession(env,user.id)
  return reply({ok:true},200,{'Set-Cookie':cookieHeader('panel',token,SESSION_TTL_MS/1000,request)})
}

// Cookie auth is exposed to CSRF from other origins only through browsers that ignore SameSite; refuse cross-origin writes outright.
export function rejectCrossOrigin(request:Request){
  if(request.method==='GET'||request.method==='HEAD'||request.method==='OPTIONS')return null
  const origin=request.headers.get('origin')
  if(origin&&new URL(origin).host!==new URL(request.url).host)return reply({error:'Origen no permitido.'},403)
  return null
}
