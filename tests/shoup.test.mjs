import { shoup, L } from '../functions/_tasks.js'
import assert from 'node:assert'
const D = 864e5, t0 = Date.parse('2026-10-16T00:00:00Z')
const task = { price_kind: 'shoup', baht: 300, src: 'ours', slots: 10, state: 'open', created_at: new Date(t0).toISOString(), shoup_at: new Date(t0).toISOString() }
const take = (d) => ({ kind: 'take', state: 'up', created_at: new Date(t0 + d * D).toISOString() })
// week 1: 0 takes (up), week 2: 9 takes (down), week 3: 7 takes (hold), weeks 4-8 quiet (up, capped at +3)
const ans = [...Array(9)].map(() => take(8)).concat([...Array(7)].map(() => take(15)))
const s = shoup(task, ans, t0 + 56 * D + 1)
console.log(s.steps.map((x) => `${x.week}:${x.n}→${x.baht}`).join(' '), '| now', s.baht, 'range', s.floor, s.ceiling)
assert.deepEqual(s.steps.slice(0, 3).map((x) => x.baht), [500, 300, 300])
assert.equal(s.baht, 1500)
// user post: org answers ignored, 3 people answers in a week → down
const u = { ...task, src: 'user', slots: 3, baht: 1000 }
const ua = [{ org: 'hongdam', kind: 'offer', state: 'up', created_at: new Date(t0).toISOString() }, ...[1, 2, 3].map((d) => ({ kind: 'offer', state: 'up', created_at: new Date(t0 + d * D).toISOString() }))]
const us = shoup(u, ua, t0 + 7 * D + 1)
assert.equal(us.baht, 500); console.log('user busy week →', us.baht)
assert.equal(shoup({ ...u, state: 'closed', closed_at: new Date(t0 + 3 * D).toISOString() }, [], t0 + 60 * D).baht, 1000)
console.log('ok')
