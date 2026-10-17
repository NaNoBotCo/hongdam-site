// The Impossible layer on hongdam.net/tasks: its tasks sit among ours, tagged, with the pay and the test.
//   node --experimental-sqlite tests/layer.test.mjs
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'
import { mix, layerOf, LAYERS } from '../functions/_tasks.js'
import { onRequest } from '../functions/tasks/[[path]].js'

const root = new URL('../', import.meta.url)
const raw = new DatabaseSync(':memory:')
raw.exec(readFileSync(new URL('migrations/0001_tasks.sql', root), 'utf8'))
raw.exec(readFileSync(new URL('data/tasks/seed.sql', root), 'utf8'))
// enough of D1 for the pages
const stmt = (sql, args = []) => ({
  bind: (...a) => stmt(sql, a),
  all: async () => ({ results: raw.prepare(sql).all(...args) }),
  first: async () => raw.prepare(sql).get(...args) ?? null,
  run: async () => { const r = raw.prepare(sql).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } } },
})
const env = { TASKS: { prepare: (sql) => stmt(sql) } }
const get = async (path) => (await onRequest({ request: new Request('https://hongdam.net' + path), env, params: { path: path.split('/').filter(Boolean).slice(1) }, next: () => new Response('next'), waitUntil() {} })).text()

assert.deepEqual(LAYERS.map((l) => l.id), ['impossible'])
assert.equal(layerOf('imp-lights')?.id, 'impossible')
assert.equal(layerOf('pl-roadworks'), null)
const rows = [1, 2, 3, 4, 5].map((id) => ({ id, cat: 'pl-roadworks' })).concat([6, 7, 8].map((id) => ({ id, cat: 'imp-ping' })))
assert.deepEqual(mix(rows).map((t) => t.id), [1, 2, 6, 3, 4, 7, 5, 8], 'one after every two, the rest at the end')

const n = raw.prepare("SELECT COUNT(*) n FROM task WHERE cat LIKE 'imp-%'").get().n
assert.equal(n, 12)
const board = await get('/tasks')
const ours = board.slice(board.indexOf('id="ours"'), board.indexOf('id="people"'))
const titles = [...ours.matchAll(/<h3><a href="\/tasks\/(\d+)">/g)].map((m) => Number(m[1]))
const imp = new Set(raw.prepare("SELECT id FROM task WHERE cat LIKE 'imp-%'").all().map((r) => r.id))
assert.ok(!imp.has(titles[0]) && imp.has(titles[2]), 'mixed in, not a block at the end')
assert.equal((ours.match(/class="layer"/g) || []).length, 12, 'each one tagged')
assert.match(ours, /Prayer, nam daeng, gratitude and \$100/)
assert.match(board, /href="\/tasks\/c\/impossible">Impossible · เป็นไปไม่ได้/)
const group = await get('/tasks/c/impossible')
assert.match(group, /Open to anyone, anywhere/)
assert.equal((group.match(/<article class="card">/g) || []).length, 12)
const one = raw.prepare("SELECT id FROM task WHERE key = 'imp-lights'").get().id
const page = await get('/tasks/' + one)
assert.match(page, /Solved when one Chiang Mai junction/)
assert.match(page, /id="take"/, 'a form to take it')
console.log('ok', titles.length, 'of ours on the board,', n, 'impossible')
