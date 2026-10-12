/**
 * GET/POST /api/pay/verify — the translation payment box's slip check
 * (nanobotco-pay, Nan 2026-10-12). Secrets on the Pages project:
 *   SLIPOK_KEY, SLIPOK_BRANCH   the slip check (off without both)
 *   RESEND_API_KEY              shared with /api/contact
 *   PAY_MAIL_TO, PAY_MAIL_FROM  where a confirmed payment is mailed
 */
import { handle } from './_verify.js'

const PRICES = { new: [1500, 5, 500], check: [500, 5, 150], stamp: 100 }

export async function onRequest({ request, env, waitUntil }) {
  return handle(request, env, { prices: PRICES, refPrefix: 'HD', site: 'hongdam.net' }, { waitUntil })
}
