/**
 * POST /api/order — relays an order from hongdam.net/cyber-awards to Beer.
 *
 * The page builds the order text itself; this endpoint caps it, tags it with
 * the reference, and sends it through Resend. Payment happens on PayPal, Wise
 * or Bitcoin; nothing here touches money.
 *
 * Secrets on the Pages project (shared with /api/contact):
 *   RESEND_API_KEY   full-access Resend key
 *   CONTACT_TO       destination mailbox
 * ORDER_TO is optional: a comma-separated list that replaces CONTACT_TO for
 * orders (e.g. Beer and Nan both).
 */

const reply = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const clean = (v, max) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const cleanBody = (v, max) =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
const looksLikeEmail = (v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v);

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.json();
  } catch {
    return reply(400, { ok: false, error: "Could not read that order." });
  }

  const ref = clean(form.ref, 40);
  const method = clean(form.method, 40);
  const email = clean(form.email, 200);
  const text = cleanBody(form.text, 3000);
  if (!/^CSA-\d{6}-[A-Z0-9]{4}$/.test(ref) || !text)
    return reply(400, { ok: false, error: "That order is incomplete." });

  const to = (env.ORDER_TO || env.CONTACT_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!env.RESEND_API_KEY || !to.length)
    return reply(500, { ok: false, error: "Mail is not configured yet." });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || "Hongdam <hongdam@send.motdang.net>",
      to,
      ...(looksLikeEmail(email) ? { reply_to: email } : {}),
      subject: `Order ${ref} — ${method}`,
      text: [
        text,
        "",
        `Country: ${request.cf?.country || "?"}`,
        `Page: ${clean(form.page, 300) || "(unknown)"}`,
      ].join("\n"),
    }),
  });

  if (!res.ok) {
    console.error("resend", res.status, await res.text());
    return reply(502, { ok: false, error: "The order did not send." });
  }
  return reply(200, { ok: true, ref });
}
