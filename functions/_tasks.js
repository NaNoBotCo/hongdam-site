/**
 * The task board: data, Shoup prices, posting and answering.
 * Pages live in functions/tasks/[[path]].js, JSON in functions/api/tasks/[[path]].js.
 *
 * Bindings on the Pages project:
 *   TASKS          D1 hongdam-tasks (migrations/0001_tasks.sql)
 *   RT_LIMIT       KV, posts and answers per address per day
 *   AI             Llama Guard; an unsafe post or answer is held
 *   DISCORD_TASKS  forum webhook (#help-desk) told of each post, answer and take
 *   TASKS_ADMIN    bearer key for answers in the name of Mot Dang, Hongdam or the Visa Desk
 *
 * SHOUP (Donald Shoup, The High Cost of Free Parking; SFpark's rule)
 * A posting on the Shoup ladder is checked once a week from the day its clock
 * started. Its occupancy is the takers (our postings) or the answers (a
 * poster's task) that week over its slots. Over 80%: one rung down. Under 60%:
 * one rung up. Between: no change. It moves at most three rungs either way
 * from where it opened, and stops moving when the task closes.
 * The price Mot Dang, Hongdam and the Visa Desk answer with is per category,
 * checked every 30 days on the share of their answers accepted (over 80%: up,
 * under 60%: down, fewer than three answers: no change).
 */
import { GRAPH } from './api/_taskgraph.js'

export const L = GRAPH.ladder
export const ORGS = GRAPH.orgs
export const NODES = GRAPH.nodes
export const CAT = Object.fromEntries(NODES.map((n) => [n.id, n]))
export const ROOTS = NODES.filter((n) => !n.up)
// a layer is a group whose tasks sit among the others on the board (Impossible, her ask 2026-10-17)
export const LAYERS = ROOTS.filter((n) => n.layer)
export const layerOf = (cat) => (CAT[cat]?.layer ? CAT[cat] : CAT[CAT[cat]?.up]?.layer ? CAT[CAT[cat].up] : null)
export const KIDS = Object.fromEntries(ROOTS.map((r) => [r.id, NODES.filter((n) => n.up === r.id)]))
export const LINE_OA = '@964yxgnk'
export const ORIGIN = 'https://hongdam.net'

const DAY = 864e5
const WEEK = 7 * DAY
const REACH = 3
export const iso = (t) => new Date(t).toISOString()

export const LIM = { title: 120, what: 2000, place: 80, name: 60, contact: 120, note: 600, cat_new: 60, perDay: 5, answersPerDay: 20 }

export function rungOf(b) {
  let best = 0
  L.forEach((v, i) => { if (Math.abs(v - b) < Math.abs(L[best] - b)) best = i })
  return best
}
const clamp = (r, r0) => Math.max(0, Math.min(L.length - 1, Math.max(r0 - REACH, Math.min(r0 + REACH, r))))

export function baht(v) {
  if (v == null) return ''
  return '฿' + (v < 1 ? v.toFixed(2) : Math.round(v).toLocaleString('en-US'))
}

// The weekly Shoup walk for one posting. answers: its answer rows.
export function shoup(task, answers, now) {
  if (task.price_kind !== 'shoup') return null
  const r0 = rungOf(task.baht)
  const t0 = Date.parse(task.shoup_at || task.created_at)
  const end = task.state === 'open' ? now : Date.parse(task.closed_at || iso(now))
  const weeks = Math.max(0, Math.floor((end - t0) / WEEK))
  const counted = answers.filter((a) => a.state === 'up' && !a.org && (task.src === 'ours' ? a.kind === 'take' : true))
  let r = r0
  const steps = []
  for (let w = 0; w < weeks; w++) {
    const a = t0 + w * WEEK, b = a + WEEK
    const n = counted.filter((x) => { const t = Date.parse(x.created_at); return t >= a && t < b }).length
    const occ = n / Math.max(1, task.slots)
    const want = occ > 0.8 ? -1 : occ < 0.6 ? 1 : 0
    const nr = clamp(r + want, r0)
    steps.push({ week: w + 1, from: iso(a), n, slots: task.slots, move: nr - r, baht: L[nr] })
    r = nr
  }
  return {
    baht: L[r], opened: L[r0], steps,
    floor: L[clamp(-99, r0)], ceiling: L[clamp(99, r0)],
    next: task.state === 'open' ? iso(t0 + (weeks + 1) * WEEK) : null,
  }
}

// The price our three answer with in a category, stepped lazily every 30 days.
export async function catBaht(db, cat, now) {
  const n = CAT[cat]
  if (!n?.price || n.price.baht == null) return null
  const r0 = rungOf(n.price.baht)
  let row = await db.prepare('SELECT * FROM catprice WHERE cat = ?').bind(cat).first()
  if (!row) {
    await db.prepare('INSERT OR IGNORE INTO catprice (cat, rung, stepped_at, log) VALUES (?,?,?,?)').bind(cat, r0, iso(now), '[]').run()
    return L[r0]
  }
  if (now - Date.parse(row.stepped_at) >= 30 * DAY) {
    const s = await db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(a.accepted_at IS NOT NULL), 0) k FROM answer a JOIN task t ON t.id = a.task_id
      WHERE t.cat = ? AND a.org IS NOT NULL AND a.created_at >= ? AND a.created_at < ?`).bind(cat, row.stepped_at, iso(now)).first()
    let move = 0
    if (s.n >= 3) move = s.k / s.n > 0.8 ? 1 : s.k / s.n < 0.6 ? -1 : 0
    const r = clamp(row.rung + move, r0)
    const log = JSON.parse(row.log || '[]').concat([{ at: iso(now), answers: s.n, accepted: s.k, baht: L[r] }]).slice(-24)
    await db.prepare('UPDATE catprice SET rung = ?, stepped_at = ?, log = ? WHERE cat = ?').bind(r, iso(now), JSON.stringify(log), cat).run()
    row = { ...row, rung: r }
  }
  return L[row.rung]
}

// What one of ours says in its answer, from the category's price.
export function orgSays(org, cat, b) {
  const o = ORGS[org], p = CAT[cat]?.price || { quote: true }
  if (p.baht != null) return { en: `${o.en} can do this for ${baht(b ?? p.baht)}.`, th: `${o.th} รับทำ ${baht(b ?? p.baht)}` }
  if (p.her) return { en: `${o.en}: ${p.her}.`, th: `${o.th}: ${p.her}` }
  if (p.free) return { en: `${o.en} does this free.`, th: `${o.th} ทำให้ฟรี` }
  if (p.trade) return { en: `${o.en} takes this as a trade, work for work.`, th: `${o.th} รับแลกงาน` }
  return { en: `${o.en} sends a written quote.`, th: `${o.th} เสนอราคาเป็นลายลักษณ์อักษร` }
}

export const lineUrl = (text) => `https://line.me/R/oaMessage/${LINE_OA}/?text=${encodeURIComponent(text)}`

// ── reading ────────────────────────────────────────────────────────────────
export async function answersFor(db, ids) {
  if (!ids.length) return {}
  const rows = (await db.prepare(`SELECT * FROM answer WHERE task_id IN (${ids.map(() => '?').join(',')}) AND state = 'up' ORDER BY created_at`).bind(...ids).all()).results
  const by = {}
  for (const a of rows) (by[a.task_id] ||= []).push(a)
  return by
}

export async function openTasks(db, now, { cat, src } = {}) {
  const where = ["state = 'open'", '(ends_at IS NULL OR ends_at > ?)']
  const args = [iso(now)]
  if (src) { where.push(`src IN (${src.map(() => '?').join(',')})`); args.push(...src) }
  if (cat) {
    const ids = KIDS[cat] ? [cat, ...KIDS[cat].map((k) => k.id)] : [cat]
    where.push(`cat IN (${ids.map(() => '?').join(',')})`); args.push(...ids)
  }
  return (await db.prepare(`SELECT * FROM task WHERE ${where.join(' AND ')} ORDER BY CASE src WHEN 'ours' THEN 0 ELSE 1 END, CASE src WHEN 'ours' THEN id ELSE -id END LIMIT 300`).bind(...args).all()).results
}

// One layer task after every `every` others, the rest at the end.
export function mix(rows, every = 2) {
  const plain = rows.filter((t) => !layerOf(t.cat)), lay = rows.filter((t) => layerOf(t.cat))
  const out = []
  while (plain.length || lay.length) {
    out.push(...plain.splice(0, every))
    if (lay.length) out.push(lay.shift())
  }
  return out
}

// Public shape of a task, for pages and JSON. Contacts and tokens stay out.
export function pub(t, answers, now) {
  const s = shoup(t, answers, now)
  const note = t.price_note ? JSON.parse(t.price_note) : null
  return {
    id: t.id, url: `${ORIGIN}/tasks/${t.id}`, src: t.src, org: t.org, poster: t.poster, cat: t.cat, cat_new: t.cat_new,
    layer: layerOf(t.cat)?.id || null,
    by: t.by, title: t.title, title_th: t.title_th, what: t.what, what_th: t.what_th, place: t.place, href: t.href, site: t.site,
    price: t.price_kind === 'shoup' ? { kind: 'shoup', baht: s.baht, unit: t.unit, opened: s.opened, floor: s.floor, ceiling: s.ceiling, next_check: s.next, steps: s.steps }
      : t.price_kind === 'fixed' ? { kind: 'fixed', baht: t.baht, unit: t.unit }
      : t.price_kind === 'mirror' ? { kind: 'elsewhere', en: note?.en, th: note?.th }
      : { kind: 'none' },
    state: t.state, created_at: t.created_at, ends_at: t.ends_at,
    answers: answers.map((a) => ({
      id: a.id, org: a.org, kind: a.kind, name: a.name, baht: a.baht, accepted: !!a.accepted_at, created_at: a.created_at,
      says: a.org ? orgSays(a.org, t.cat, a.baht) : null, note: a.note,
    })),
  }
}

// ── writing ────────────────────────────────────────────────────────────────
const clean = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const cleanBody = (v, max) => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '')

export async function readBody(request) {
  const ct = request.headers.get('content-type') || ''
  if (ct.includes('application/json')) return await request.json().catch(() => ({}))
  const f = await request.formData().catch(() => null)
  return f ? Object.fromEntries(f) : {}
}

async function ipKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || '0'
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hongdam-tasks:' + ip))
  return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function spend(env, ip, what, cap, now) {
  if (!env.RT_LIMIT) return true
  const k = `tasks:${what}:${ip}:${iso(now).slice(0, 10)}`
  const n = Number(await env.RT_LIMIT.get(k)) || 0
  if (n >= cap) return false
  await env.RT_LIMIT.put(k, String(n + 1), { expirationTtl: 2 * 86400 })
  return true
}

async function looksUnsafe(env, text) {
  if ((text.match(/https?:\/\//g) || []).length > 3) return true
  if (!env.AI) return false
  try {
    const r = await env.AI.run('@cf/meta/llama-guard-3-8b', { messages: [{ role: 'user', content: text.slice(0, 3000) }] })
    const out = String(r?.response ?? r?.result ?? '')
    return /^\s*unsafe/i.test(out) || r?.response?.safe === false
  } catch { return false }
}

function token() {
  const b = crypto.getRandomValues(new Uint8Array(18))
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c])
}

export async function tell(env, title, lines) {
  if (!env.DISCORD_TASKS) return
  const body = { username: 'Hongdam tasks', content: lines.join('\n').slice(0, 1900), thread_name: title.slice(0, 95) }
  try {
    const r = await fetch(env.DISCORD_TASKS + '?wait=false', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) await fetch(env.DISCORD_TASKS, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: body.username, content: body.content }) })
  } catch { /* the post stands without the note */ }
}

export async function createTask(ctx, b) {
  const { request, env } = ctx
  const db = env.TASKS, now = Date.now()
  const title = clean(b.title, LIM.title), what = cleanBody(b.what, LIM.what)
  const contact = clean(b.contact, LIM.contact)
  let cat = clean(b.cat, 40)
  const catNew = clean(b.cat_new, LIM.cat_new)
  const up = clean(b.up, 40)
  if (title.length < 3) return { status: 400, error: 'A title, 3 to 120 characters · ชื่องาน 3–120 ตัวอักษร' }
  if (!contact) return { status: 400, error: 'A way to reach you: LINE, phone or email · ช่องทางติดต่อ ไลน์ โทรศัพท์ หรืออีเมล' }
  if (cat === 'new' || (!CAT[cat] && catNew)) {
    if (!catNew) return { status: 400, error: 'Name the new kind of work · ตั้งชื่องานประเภทใหม่' }
    cat = CAT[up] && !CAT[up].up ? up : (CAT[up]?.up || 'data')
  }
  if (!CAT[cat]) return { status: 400, error: 'Pick a kind of work · เลือกประเภทงาน', kinds: `${ORIGIN}/tasks/graph.json` }
  const by = ['robot', 'human', 'either'].includes(b.by) ? b.by : 'either'
  const ip = await ipKey(request)
  if (!(await spend(env, ip, 'p', LIM.perDay, now))) return { status: 429, error: `${LIM.perDay} posts a day · โพสต์ได้วันละ ${LIM.perDay} งาน` }

  const named = Number(String(b.baht ?? '').replace(/[^\d.]/g, '')) || null
  const wantsShoup = b.shoup === true || b.shoup === 'on' || b.shoup === '1' || b.shoup === 'yes'
  const catB = await catBaht(db, cat, now)
  let kind = 'none', price = null
  if (wantsShoup) { kind = 'shoup'; price = L[rungOf(named ?? catB ?? 500)] }
  else if (named) { kind = 'fixed'; price = Math.round(named * 100) / 100 }
  const held = await looksUnsafe(env, `${title}\n${what}\n${catNew}`)
  const tok = token()
  const r = await db.prepare(`INSERT INTO task (src, poster, cat, cat_new, by, title, what, place, contact, price_kind, baht, unit, slots, token, state, created_at, shoup_at, ip)
    VALUES ('user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, ?)`).bind(
    clean(b.name, LIM.name) || null, cat, catNew || null, by, title, what || null, clean(b.place, LIM.place) || null, contact,
    kind, price, clean(b.unit, 30) || null, tok, held ? 'held' : 'open', iso(now), kind === 'shoup' ? iso(now) : null, ip).run()
  const id = r.meta.last_row_id
  const who = CAT[cat].who
  for (const org of who) {
    await db.prepare(`INSERT INTO answer (task_id, org, kind, name, baht, created_at) VALUES (?, ?, 'offer', ?, ?, ?)`)
      .bind(id, org, ORGS[org].en, catB, iso(now)).run()
  }
  ctx.waitUntil(tell(env, `#${id} ${title}`, [
    `${held ? 'HELD · ' : ''}New task #${id} · ${CAT[cat].en}${catNew ? ` · named: ${catNew}` : ''}`,
    `${title}`, what ? what.slice(0, 600) : '', `Pay: ${kind === 'shoup' ? `Shoup from ${baht(price)}` : kind === 'fixed' ? baht(price) : 'asks for quotes'}`,
    `Contact: ${contact}`, `Answered by: ${who.map((o) => ORGS[o].en).join(', ')}`, `${ORIGIN}/tasks/${id}`,
  ].filter(Boolean)))
  return { status: 201, id, token: tok, held, url: `${ORIGIN}/tasks/${id}`, own: `${ORIGIN}/tasks/${id}/k/${tok}` }
}

export async function createAnswer(ctx, id, b) {
  const { request, env } = ctx
  const db = env.TASKS, now = Date.now()
  const t = await db.prepare("SELECT * FROM task WHERE id = ? AND state = 'open'").bind(id).first()
  if (!t) return { status: 404, error: 'That task is closed or gone · งานนี้ปิดแล้ว' }
  const name = clean(b.name, LIM.name), note = cleanBody(b.note, LIM.note), contact = clean(b.contact, LIM.contact)
  if (!name) return { status: 400, error: 'Your name · ชื่อของคุณ' }
  if (!contact) return { status: 400, error: 'A way to reach you · ช่องทางติดต่อ' }
  const ip = await ipKey(request)
  if (!(await spend(env, ip, 'a', LIM.answersPerDay, now))) return { status: 429, error: `${LIM.answersPerDay} answers a day` }
  const kind = t.src === 'ours' ? 'take' : 'offer'
  const named = Number(String(b.baht ?? '').replace(/[^\d.]/g, '')) || null
  const held = await looksUnsafe(env, `${name}\n${note}`)
  const r = await db.prepare(`INSERT INTO answer (task_id, kind, name, note, baht, contact, state, created_at, ip) VALUES (?,?,?,?,?,?,?,?,?)`)
    .bind(id, kind, name, note || null, kind === 'offer' ? named : null, contact, held ? 'held' : 'up', iso(now), ip).run()
  ctx.waitUntil(tell(env, `#${id} ${t.title}`, [
    `${held ? 'HELD · ' : ''}${kind === 'take' ? 'Taken' : 'Answer'} on #${id} by ${name}${named ? ` at ${baht(named)}` : ''}`,
    note ? note.slice(0, 500) : '', `Contact: ${contact}`, `${ORIGIN}/tasks/${id}`,
  ].filter(Boolean)))
  return { status: 201, id: r.meta.last_row_id, kind, held }
}

export async function ownTask(db, id, tok) {
  if (!tok || tok.length < 16) return null
  return await db.prepare('SELECT * FROM task WHERE id = ? AND token = ?').bind(id, tok).first()
}

export async function ownerAct(ctx, t, b) {
  const db = ctx.env.TASKS, now = Date.now()
  if (b.do === 'shoup' && t.price_kind !== 'shoup') {
    const start = L[rungOf(t.baht ?? (await catBaht(db, t.cat, now)) ?? 500)]
    await db.prepare("UPDATE task SET price_kind = 'shoup', baht = ?, shoup_at = ? WHERE id = ?").bind(start, iso(now), t.id).run()
    return { ok: true, shoup_from: start }
  }
  if (b.do === 'fixed' && t.price_kind === 'shoup') {
    const s = shoup(t, [], now)
    await db.prepare("UPDATE task SET price_kind = 'fixed', baht = ?, shoup_at = NULL WHERE id = ?").bind(s.baht, t.id).run()
    return { ok: true, fixed: s.baht }
  }
  if (b.do === 'accept') {
    const a = await db.prepare('SELECT * FROM answer WHERE id = ? AND task_id = ?').bind(Number(b.answer), t.id).first()
    if (!a) return { error: 'No such answer' }
    await db.prepare('UPDATE answer SET accepted_at = ? WHERE id = ?').bind(iso(now), a.id).run()
    ctx.waitUntil(tell(ctx.env, `#${t.id} ${t.title}`, [`Accepted on #${t.id}: ${a.name}${a.baht ? ` ${baht(a.baht)}` : ''}`, `Poster: ${t.contact}`, `${ORIGIN}/tasks/${t.id}`]))
    return { ok: true, accepted: a.id, org: a.org, line: a.org ? lineUrl(`hongdam.net/tasks/${t.id} · ${t.title}\n${ORGS[a.org].en}${a.baht ? ` ${baht(a.baht)}` : ''}: yes, go ahead · ตกลง`) : null }
  }
  if (b.do === 'close' || b.do === 'taken') {
    await db.prepare('UPDATE task SET state = ?, closed_at = ? WHERE id = ?').bind(b.do === 'taken' ? 'taken' : 'closed', iso(now), t.id).run()
    return { ok: true, state: b.do === 'taken' ? 'taken' : 'closed' }
  }
  return { error: 'Nothing to do' }
}

export async function adminAct(ctx, id, b) {
  const db = ctx.env.TASKS, now = Date.now()
  const t = await db.prepare('SELECT * FROM task WHERE id = ?').bind(id).first()
  if (!t) return { status: 404, error: 'No such task' }
  if (b.do === 'answer' && ORGS[b.org]) {
    const v = b.baht != null ? Number(b.baht) : await catBaht(db, t.cat, now)
    await db.prepare(`INSERT INTO answer (task_id, org, kind, name, note, baht, created_at) VALUES (?, ?, 'offer', ?, ?, ?, ?)`)
      .bind(id, b.org, ORGS[b.org].en, cleanBody(b.note, LIM.note) || null, v, iso(now)).run()
    return { status: 201, ok: true }
  }
  if (b.do === 'take') {
    await db.prepare(`INSERT INTO answer (task_id, kind, name, note, created_at) VALUES (?, 'take', ?, ?, ?)`)
      .bind(id, clean(b.name, LIM.name) || 'taker', cleanBody(b.note, LIM.note) || null, iso(now)).run()
    return { status: 201, ok: true }
  }
  if (['open', 'held', 'closed', 'taken'].includes(b.do)) {
    await db.prepare('UPDATE task SET state = ?, closed_at = ? WHERE id = ?').bind(b.do, b.do === 'open' || b.do === 'held' ? null : iso(now), id).run()
    return { status: 200, ok: true, state: b.do }
  }
  if (b.do === 'answer-state' && ['up', 'held', 'down'].includes(b.state)) {
    await db.prepare('UPDATE answer SET state = ? WHERE id = ? AND task_id = ?').bind(b.state, Number(b.answer), id).run()
    return { status: 200, ok: true }
  }
  return { status: 400, error: 'do: answer {org, note?, baht?} · take {name, note?} · open · held · closed · taken · answer-state {answer, state}' }
}

export async function namedKinds(db) {
  return (await db.prepare("SELECT id, cat, cat_new, created_at FROM task WHERE cat_new IS NOT NULL AND state != 'held' ORDER BY id DESC LIMIT 200").all()).results
    .map((r) => ({ name: r.cat_new, up: CAT[r.cat]?.up || r.cat, task: r.id, at: r.created_at }))
}
