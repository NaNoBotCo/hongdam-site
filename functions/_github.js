/**
 * hongdam.net/github — GitHub profiles done in 24 hours, priced by Shoup.
 * Page docs/github/index.html, JSON functions/api/github.js, table migrations/0002_github.sql.
 *
 * SHOUP (Donald Shoup, The High Cost of Free Parking; SFpark's rule)
 * Each kind has slots a week: the profiles the team can turn round in 24 hours.
 * Every Monday 00:00 Bangkok the week just ended is checked: bookings over its
 * slots. Over 80%: one rung up. Under 60%: one rung down. Between: no change.
 * A kind moves at most three rungs either way from where it opened. Prices sit
 * on the task board's ladder; the US$ price is the round number nearest the baht
 * at 33 to the dollar. Opening prices and slots are a session's pick under Nan's
 * standing Shoup word (2026-10-15).
 */
import { GRAPH } from './api/_taskgraph.js'

export const L = GRAPH.ladder
const USD = [1, 2, 3, 5, 10, 20, 30, 50, 100, 150, 200, 300, 500, 1000, 1500, 2000, 3000, 5000, 10000]
const REACH = 3
const DAY = 864e5, WEEK = 7 * DAY
// Monday 1970-01-05 00:00 in Bangkok (UTC+7)
const MONDAY0 = Date.UTC(1970, 0, 5) - 7 * 3600e3

export const KINDS = {
  profile: { open: 3000, slots: 7, en: 'Profile', th: 'โปรไฟล์' },
  showcase: { open: 10000, slots: 3, en: 'Profile and three repos', th: 'โปรไฟล์และสามรีโป' },
  whole: { open: 30000, slots: 1, en: 'The whole account', th: 'ทั้งบัญชี' },
}

export const rungOf = (b) => L.reduce((best, v, i) => (Math.abs(v - b) < Math.abs(L[best] - b) ? i : best), 0)
export const usd = (b) => USD.reduce((best, v) => (Math.abs(v - b / 33) < Math.abs(best - b / 33) ? v : best), USD[0])
export const weekOf = (t) => Math.floor((t - MONDAY0) / WEEK)
export const weekStart = (w) => MONDAY0 + w * WEEK
export const bkk = (t) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10)

/**
 * The walk for one kind. counts: {week number: bookings}. Weeks before `from`
 * are not walked; `from` is the week the price opened.
 */
export function walk(kind, counts, from, now) {
  const k = KINDS[kind], r0 = rungOf(k.open)
  let r = r0
  const steps = []
  for (let w = from; w < weekOf(now); w++) {
    const n = counts[w] || 0, occ = n / k.slots
    const want = occ > 0.8 ? 1 : occ < 0.6 ? -1 : 0
    const nr = Math.max(0, Math.min(L.length - 1, Math.max(r0 - REACH, Math.min(r0 + REACH, r + want))))
    steps.push({ week: bkk(weekStart(w)), booked: n, slots: k.slots, move: nr - r, baht: L[nr] })
    r = nr
  }
  const w = weekOf(now)
  return {
    id: kind, en: k.en, th: k.th, baht: L[r], usd: usd(L[r]), opened: L[r0],
    floor: L[Math.max(0, r0 - REACH)], ceiling: L[Math.min(L.length - 1, r0 + REACH)],
    slots: k.slots, booked: counts[w] || 0, next_check: new Date(weekStart(w + 1)).toISOString(),
    steps: steps.slice(-12),
  }
}

// The week a new booking lands in: this one if a slot is free, else the first that has one.
export function slotWeek(kind, counts, now) {
  let w = weekOf(now)
  while ((counts[w] || 0) >= KINDS[kind].slots) w++
  return w
}

export const OPENED = weekOf(Date.parse('2026-10-19T00:00:00+07:00'))

export async function counts(db, kind) {
  const rows = (await db.prepare("SELECT week, COUNT(*) n FROM gh_order WHERE kind = ? AND state != 'void' GROUP BY week").bind(kind).all()).results
  return Object.fromEntries(rows.map((x) => [x.week, x.n]))
}

export async function prices(db, now) {
  const out = []
  for (const kind of Object.keys(KINDS)) out.push(walk(kind, db ? await counts(db, kind) : {}, OPENED, now))
  return out
}
