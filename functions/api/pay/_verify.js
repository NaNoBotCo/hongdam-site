// verify.js — the server half of the payment box. GET says whether the slip check
// is on; POST takes the slip and the choices, works the price out again, asks
// SlipOK, and mails Nan on a confirmed payment.
//
// env: SLIPOK_KEY, SLIPOK_BRANCH (the slip check; off without both),
//      RESEND_API_KEY, PAY_MAIL_TO, PAY_MAIL_FROM (the mail; skipped without them)
// opts: { prices, refPrefix, site }
import { price } from './_price.js'

const WHY = { 1010: 'late', 1012: 'used', 1013: 'amount', 1014: 'receiver' }
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export const slipOn = (env) => !!(env && env.SLIPOK_KEY && env.SLIPOK_BRANCH)

export async function checkSlip(env, file, baht, fetcher = fetch) {
  if (!slipOn(env)) return { ok: false, why: 'off' }
  if (!file || typeof file === 'string' || !file.size || file.size > 8 * 1024 * 1024) return { ok: false, why: 'nofile' }
  const form = new FormData()
  form.append('files', file, file.name || 'slip.jpg')
  form.append('amount', String(baht))
  form.append('log', 'true')
  let r, j
  try {
    r = await fetcher(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(env.SLIPOK_BRANCH)}`, {
      method: 'POST', headers: { 'x-authorization': env.SLIPOK_KEY }, body: form })
    j = await r.json()
  } catch { return { ok: false, why: 'service' } }
  const d = j && j.data
  if (j && j.success && d && d.success && d.transRef && Number(d.amount) >= baht)
    return { ok: true, transRef: String(d.transRef), amount: Number(d.amount) }
  return { ok: false, why: WHY[j && j.code] || (r.status >= 500 ? 'service' : 'unread') }
}

async function mail(env, subject, text) {
  if (!env.RESEND_API_KEY || !env.PAY_MAIL_TO || !env.PAY_MAIL_FROM) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.PAY_MAIL_FROM, to: env.PAY_MAIL_TO.split(','), subject, text }) }).catch(() => {})
}

export async function handle(request, env, opts, { fetcher = fetch, waitUntil = null } = {}) {
  if (request.method === 'GET') return json({ on: slipOn(env) })
  if (request.method !== 'POST') return json({ ok: false, why: 'unread' }, 405)
  let body
  try { body = await request.formData() } catch { return json({ ok: false, why: 'nofile' }, 400) }
  const choice = { svc: body.get('svc') === 'check' ? 'check' : 'new', pages: body.get('pages'), stamp: !!body.get('stamp') }
  const baht = price(opts.prices, choice)
  const r = await checkSlip(env, body.get('slip'), baht, fetcher)
  if (!r.ok) return json({ ok: false, why: r.why })
  const ref = `${opts.refPrefix}-${r.transRef.slice(-6)}`
  const m = mail(env, `Paid: ฿${baht} · ${opts.site} translation · ${ref}`,
    `฿${baht} for ${choice.svc === 'check' ? 'checking a translation' : 'a new translation'}, ` +
    `${Math.floor(Number(choice.pages)) || 1} page(s)${choice.stamp ? ', stamped' : ''}.\n` +
    `Reference given to the payer: ${ref}\nBank reference: ${r.transRef}\nConfirmed by SlipOK on ${opts.site}.`)
  if (waitUntil) waitUntil(m); else await m
  return json({ ok: true, ref, amount: baht })
}
