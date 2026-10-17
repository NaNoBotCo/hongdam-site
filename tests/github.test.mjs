import { walk, slotWeek, weekOf, weekStart, OPENED, usd, KINDS } from '../functions/_github.js'
import assert from 'node:assert'
const W = OPENED, now = weekStart(W + 6) + 3600e3
// profile, 7 slots: week 1 full (up), week 2 quiet (down), week 3 five of seven (hold), weeks 4-6 full (up, capped +3)
const c = { [W]: 7, [W + 1]: 0, [W + 2]: 5, [W + 3]: 7, [W + 4]: 7, [W + 5]: 7 }
const p = walk('profile', c, W, now)
console.log(p.steps.map((s) => `${s.week}:${s.booked}→${s.baht}`).join(' '), '| now', p.baht, 'US$' + p.usd, 'range', p.floor, p.ceiling)
assert.deepEqual(p.steps.map((s) => s.baht), [5000, 3000, 3000, 5000, 10000, 20000])
assert.equal(p.baht, 20000)
assert.equal(walk('profile', {}, W, weekStart(W + 10)).baht, 1000) // ten quiet weeks stop three rungs down
assert.equal(walk('whole', {}, W, weekStart(W)).baht, 30000)
assert.equal(slotWeek('whole', { [W]: 1, [W + 1]: 1 }, weekStart(W) + 1), W + 2)
assert.equal(weekOf(Date.parse('2026-10-19T00:00:00+07:00')), W)
assert.equal(weekOf(Date.parse('2026-10-18T23:59:00+07:00')), W - 1)
assert.deepEqual(Object.values(KINDS).map((k) => usd(k.open)), [100, 300, 1000])
console.log('ok')
