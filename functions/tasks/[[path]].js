/**
 * hongdam.net/tasks — the task board, rendered on the server so it reads with no script.
 *   /tasks                 post, take, answer
 *   /tasks/c/:kind         one kind of work, or a group of them
 *   /tasks/:id             one task and its answers
 *   /tasks/:id/k/:token    the poster's own page: contacts, accept, Shoup, close
 *   /tasks/graph/          static, written by tools/build_tasks.py
 */
import {
  CAT, ROOTS, KIDS, ORGS, L, ORIGIN, LAYERS, layerOf, mix, baht, iso, rungOf, lineUrl, orgSays, shoup, catBaht,
  openTasks, answersFor, createTask, createAnswer, ownTask, ownerAct, readBody,
} from '../_tasks.js'

const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const BY = { robot: ['robot', 'บอท'], human: ['human', 'คน'], either: ['robot or human', 'บอทหรือคน'], both: ['robot or human', 'บอทหรือคน'] }
const day = (s) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })

const CSS = `
.sub{display:block;font-family:"Thonburi","Noto Sans Thai",sans-serif;font-size:.42em;color:var(--gold-deep);font-weight:500;margin-top:8px}
.go{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 22px}
.btn.alt{background:transparent;color:var(--gold);border:1px solid var(--gold-deep)}
.btn.alt:hover{background:var(--lacquer-3);color:var(--cream)}
form.post{background:var(--lacquer-2);border:1px solid var(--line);border-radius:14px;padding:18px;display:grid;gap:12px;max-width:720px}
form label{display:grid;gap:4px;font-size:14px;letter-spacing:.04em;color:var(--gold-deep)}
form input,form textarea,form select{font:inherit;font-size:16px;color:var(--cream);background:var(--lacquer);border:1px solid var(--line);border-radius:8px;padding:10px 12px;width:100%}
form textarea{min-height:84px;resize:vertical}
form .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
form details{border-top:1px solid var(--line);padding-top:10px}
form summary{cursor:pointer;color:var(--gold);font-size:15px}
.chk{display:flex;gap:10px;align-items:flex-start;font-size:15px;color:var(--cream);letter-spacing:0}
.chk input{width:auto;margin-top:5px}
.chk small{display:block;color:var(--cream-dim)}
.radios{display:flex;gap:16px;flex-wrap:wrap;font-size:15px;color:var(--cream)}
.radios label{display:flex;gap:6px;align-items:center;color:var(--cream)} .radios input{width:auto}
section.list{margin-top:44px}
section.list>h2{margin-bottom:6px} section.list>p{color:var(--cream-dim);font-size:15px;margin-bottom:14px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.card{background:var(--lacquer-2);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px}
.card h3{font-size:17px;line-height:1.35;color:var(--cream);font-weight:600}
.card h3 a{color:inherit} .card .th{color:var(--cream-dim);font-size:15px}
.tags{display:flex;gap:6px;flex-wrap:wrap;font-size:12px;letter-spacing:.06em}
.tags span,.tags a{border:1px solid var(--line);border-radius:999px;padding:2px 9px;color:var(--cream-dim)}
.tags .org{color:var(--gold);border-color:var(--gold-deep)}
.tags .robot{color:var(--jade)} .tags .human{color:var(--verm)}
.tags .layer{color:var(--lacquer);background:var(--gold);border-color:var(--gold);font-weight:600}
p.about{max-width:720px;margin:6px 0 18px}
.pay{font-family:Georgia,serif;font-size:26px;color:var(--gold);line-height:1.1}
.pay small{font-family:inherit;font-size:14px;color:var(--cream-dim);margin-left:4px}
.pay .mv{display:block;font-family:"Avenir Next",system-ui,sans-serif;font-size:12px;letter-spacing:.06em;color:var(--jade);margin-top:4px}
.payline{font-size:14px;color:var(--cream-dim)}
.card .acts{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap}
.card .btn{font-size:14px;padding:8px 14px}
.ans{list-style:none;display:grid;gap:4px;font-size:14px;color:var(--cream-dim)}
.ans b{color:var(--gold);font-weight:600}
.kinds{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.kinds a{display:block;background:var(--lacquer-2);border:1px solid var(--line);border-radius:10px;padding:12px 14px;color:var(--cream)}
.kinds a span{display:block;color:var(--cream-dim);font-size:14px} .kinds a i{font-style:normal;color:var(--gold);font-size:13px}
.kinds a:hover{border-color:var(--gold-deep)}
details.fold{margin-top:28px;border-top:1px solid var(--line);padding-top:12px;max-width:720px}
details.fold summary{cursor:pointer;color:var(--gold)} details.fold p,details.fold li{color:var(--cream-dim);font-size:15px;margin-top:8px}
details.fold code{font-size:13px;color:var(--cream);word-break:break-all}
.crumbs{font-size:14px;color:var(--cream-dim);margin-bottom:10px} .crumbs a{color:var(--gold-deep)}
.what{white-space:pre-wrap;color:var(--cream);max-width:68ch;margin:14px 0}
.what.th{color:var(--cream-dim)}
.box{background:var(--lacquer-2);border:1px solid var(--line);border-radius:12px;padding:16px;margin:18px 0;max-width:720px}
.box.own{border-color:var(--gold)}
.box h2{font-size:19px;margin-bottom:8px}
.box p{color:var(--cream-dim);font-size:15px}
.answer{border-top:1px solid var(--line);padding:12px 0;display:grid;gap:6px}
.answer:first-of-type{border-top:0}
.answer .who{color:var(--gold);font-weight:600} .answer .note{white-space:pre-wrap;color:var(--cream-dim);font-size:15px}
.answer .ok{color:var(--jade);font-size:13px}
.steps{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px} .steps td,.steps th{border-top:1px solid var(--line);padding:5px 6px;text-align:left;color:var(--cream-dim)}
.flash{background:var(--lacquer-3);border-left:3px solid var(--jade);padding:10px 14px;border-radius:6px;margin:12px 0;max-width:720px}
.flash.err{border-left-color:var(--verm)}
.inline{display:inline}
footer{max-width:980px;margin:0 auto;padding:24px 16px 48px;color:var(--cream-dim);font-size:15px}
@media (max-width:520px){.pay{font-size:23px} h1{font-size:34px}}
`

function page({ title, desc, path, body, noindex }) {
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)}</title><meta name="description" content="${e(desc)}">
<meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${ORIGIN}${e(path)}"><meta property="og:image" content="${ORIGIN}/assets/card.jpg"><meta property="og:image:alt" content="Hongdam หงส์ดำ, Chiang Rai"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg"><link rel="canonical" href="${ORIGIN}${e(path)}">${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="alternate" type="application/json" href="/api/tasks">
<link rel="stylesheet" href="/assets/rt.css"><style>${CSS}</style></head><body>
<header class="top"><a class="mark" href="/">HONGDAM <span lang="th">หงส์ดำ</span></a>
<nav><a href="/tasks"${path === '/tasks' ? ' aria-current="page"' : ''}>Tasks</a><a href="/tasks/graph/">Graph</a><a href="/translation/">Translation</a><a href="/own">Own</a></nav></header>
<main>${body}</main>
<footer><span lang="th">หงส์ดำ</span> Hongdam · Chiang Rai · tasks answered by <a href="https://motdang.net/">Mot Dang</a>, <a href="/">Hongdam</a> and <a href="https://chiangmaivisadesk.com/">Chiang Mai Visa Desk</a> · <a href="/api/tasks">API</a> · <a href="/tasks/graph.json">graph.json</a></footer>
<script>
document.querySelectorAll('select[name=cat]').forEach(function (s) {
  var f = s.form, n = f.querySelector('.catnew');
  function show() { if (n) n.hidden = s.value !== 'new' }
  s.addEventListener('change', show); show();
});
</script>
</body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}

// ── pieces ────────────────────────────────────────────────────────────────
function catOptions(sel) {
  return '<option value="">Kind of work · ประเภทงาน</option>' + ROOTS.map((r) =>
    `<optgroup label="${e(r.en)} · ${e(r.th)}">` + KIDS[r.id].map((k) =>
      `<option value="${k.id}"${k.id === sel ? ' selected' : ''}>${e(k.en)} · ${e(k.th)}</option>`).join('') + '</optgroup>').join('') +
    '<option value="new">Something else: name it · อย่างอื่น ตั้งชื่อเอง</option>'
}

function postForm(sel) {
  const groups = ROOTS.map((r) => `<option value="${r.id}">${e(r.en)} · ${e(r.th)}</option>`).join('')
  return `<form class="post" id="post" method="post" action="/tasks">
  <label>What needs doing · งานอะไร<input name="title" required minlength="3" maxlength="120" placeholder="Translate a marriage certificate into Thai · แปลทะเบียนสมรสเป็นภาษาไทย"></label>
  <label>Details · รายละเอียด<textarea name="what" maxlength="2000" placeholder="Pages, dates, place, what done looks like · จำนวนหน้า วันที่ สถานที่ งานเสร็จหน้าตาแบบไหน"></textarea></label>
  <div class="row">
    <label>Kind · ประเภท<select name="cat" required>${catOptions(sel)}</select></label>
    <label>Reach you on · ติดต่อทาง<input name="contact" required maxlength="120" placeholder="LINE ID, phone or email · ไลน์ เบอร์ หรืออีเมล"></label>
  </div>
  <div class="row catnew"><label>New kind of work · ชื่องานประเภทใหม่<input name="cat_new" maxlength="60"></label>
    <label>Closest group · กลุ่มที่ใกล้ที่สุด<select name="up">${groups}</select></label></div>
  <label class="chk"><input type="checkbox" name="shoup" value="on" checked><span>Let the market set the pay (Shoup) · ให้ตลาดตั้งค่าจ้าง
    <small>Up a step each week fewer than two answer; down a step when three or more do. Leave the pay empty and it opens at what we charge for this kind of work. · ไม่ค่อยมีคนตอบ ขึ้นหนึ่งขั้นทุกสัปดาห์ คนตอบสามคนขึ้นไป ลดหนึ่งขั้น</small></span></label>
  <details><summary>Pay, robot or human, place, name · ค่าจ้าง บอทหรือคน สถานที่ ชื่อ</summary>
    <div class="row" style="margin-top:10px">
      <label>Pay in baht · ค่าจ้าง (บาท)<input name="baht" inputmode="decimal" placeholder="500"></label>
      <label>Per · ต่อ<input name="unit" maxlength="30" placeholder="the job · งาน"></label>
    </div>
    <div class="radios" style="margin-top:10px"><label><input type="radio" name="by" value="either" checked>robot or human · บอทหรือคน</label>
      <label><input type="radio" name="by" value="human">human · คน</label><label><input type="radio" name="by" value="robot">robot · บอท</label></div>
    <div class="row" style="margin-top:10px"><label>Place · สถานที่<input name="place" maxlength="80" placeholder="Chiang Rai · เชียงราย"></label>
      <label>Your name · ชื่อ<input name="name" maxlength="60"></label></div>
  </details>
  <div><button type="submit">Post · ลงงาน</button></div>
</form>`
}

function payOf(t, ans, now) {
  if (t.price_kind === 'shoup') {
    const s = shoup(t, ans, now)
    const moved = s.baht !== s.opened ? `<span class="mv">${s.baht > s.opened ? '▲' : '▼'} from ${baht(s.opened)} · Shoup</span>` : '<span class="mv">Shoup · ตลาดตั้ง</span>'
    return `<div class="pay">${baht(s.baht)}<small>${e(t.unit || 'the job')}</small>${moved}</div>`
  }
  if (t.price_kind === 'fixed') return `<div class="pay">${baht(t.baht)}<small>${e(t.unit || 'the job')} · fixed</small></div>`
  if (t.price_kind === 'mirror') { const n = JSON.parse(t.price_note || '{}'); return `<div class="payline">${e(n.en)}<br><span lang="th">${e(n.th)}</span></div>` }
  if (t.src === 'elsewhere') return `<div class="payline">${seenOn(t)[0]} ${e(t.site)} · ${seenOn(t)[1]} ${e(t.site)}</div>`
  return '<div class="payline">Asks for prices · รอเสนอราคา</div>'
}

function tags(t) {
  const c = CAT[t.cat], b = BY[t.by] || BY.either
  const lay = layerOf(t.cat)
  return `<div class="tags">${lay ? `<a class="layer" href="/tasks/c/${lay.id}">${e(lay.en)} · ${e(lay.th)}</a>` : ''}${t.org ? `<span class="org">${e(ORGS[t.org].en)}</span>` : ''}<a href="/tasks/c/${c.id}">${e(c.en)}</a>${t.cat_new ? `<span>${e(t.cat_new)}</span>` : ''}<span class="${t.by}">${b[0]} · ${b[1]}</span>${t.place ? `<span>${e(t.place)}</span>` : ''}</div>`
}

function card(t, ans, now) {
  const people = ans.filter((a) => !a.org)
  const orgs = ans.filter((a) => a.org)
  const acts = t.src === 'ours'
    ? `${t.href ? `<a class="btn" href="${e(t.href)}">Start · เริ่ม</a>` : ''}<a class="btn alt" href="/tasks/${t.id}#take">I'll do it · รับงาน</a>`
    : `<a class="btn" href="/tasks/${t.id}#answer">Answer · ตอบ</a>${t.href ? `<a class="btn alt" href="${e(t.href)}" rel="nofollow noopener">${e(t.site || 'Source')} ↗</a>` : ''}`
  const said = orgs.length ? `<ul class="ans">${orgs.map((a) => `<li><b>${e(ORGS[a.org].en)}</b> ${e(orgSays(a.org, t.cat, a.baht).en.replace(ORGS[a.org].en, '').replace(/^[:\s]+/, ''))}</li>`).join('')}${people.length ? `<li>+ ${people.length} more · อีก ${people.length}</li>` : ''}</ul>`
    : people.length ? `<ul class="ans"><li>${people.length} ${t.src === 'ours' ? 'taking it · คนรับ' : 'answers · คำตอบ'}</li></ul>` : ''
  return `<article class="card">${tags(t)}<h3><a href="/tasks/${t.id}">${e(t.title)}</a></h3>${t.title_th ? `<div class="th" lang="th">${e(t.title_th)}</div>` : ''}${payOf(t, ans, now)}${said}<div class="acts">${acts}</div></article>`
}

const FOLDS = `
<details class="fold"><summary>How pay moves · ค่าจ้างขยับอย่างไร</summary>
<p>Pay on the Shoup ladder follows Donald Shoup's rule for parking in San Francisco. Once a week each task counts its takers (our postings) or answers (yours) against its slots. Over 80% full, one step down; under 60%, one step up; in between, no change. A task moves at most three steps from where it opened. The steps: ${L.map(baht).join(' · ')}.</p>
<p lang="th">ค่าจ้างแบบ Shoup ขยับสัปดาห์ละครั้ง นับคนรับงานหรือคนตอบเทียบกับจำนวนที่ต้องการ เกิน 80% ลดหนึ่งขั้น ต่ำกว่า 60% ขึ้นหนึ่งขั้น ระหว่างนั้นคงเดิม ขยับได้ไม่เกินสามขั้นจากราคาเริ่ม</p>
<p>The price Mot Dang, Hongdam and the Visa Desk answer with moves every 30 days by the share of their answers accepted: over 80%, up a step; under 60%, down a step.</p></details>
<details class="fold"><summary>For bots · สำหรับบอท</summary>
<p><code>GET ${ORIGIN}/api/tasks</code> open tasks · <code>POST ${ORIGIN}/api/tasks {"title","what","cat","contact","by":"robot","baht","shoup":true}</code> · <code>POST ${ORIGIN}/api/tasks/:id/answers {"name","contact","note","baht"}</code> · kinds of work: <code>${ORIGIN}/tasks/graph.json</code>. Bot work for Mot Dang also runs on <a href="https://motdang.net/anthill/">the Anthill</a>.</p></details>`

// ── pages ─────────────────────────────────────────────────────────────────
async function board(db, now, flash) {
  const rows = await openTasks(db, now)
  const ans = await answersFor(db, rows.map((t) => t.id))
  const ours = mix(rows.filter((t) => t.src === 'ours')), people = rows.filter((t) => t.src !== 'ours')
  const count = {}
  for (const t of rows) { const r = CAT[t.cat].up || t.cat; count[r] = (count[r] || 0) + 1 }
  const kinds = ROOTS.map((r) => `<a href="/tasks/c/${r.id}">${e(r.en)}<span lang="th">${e(r.th)}</span><i>${KIDS[r.id].length} kinds${count[r.id] ? ` · ${count[r.id]} open` : ''}</i></a>`).join('')
  const nKinds = ROOTS.reduce((n, r) => n + KIDS[r.id].length, 0)
  return page({
    title: 'Tasks · งาน · Hongdam', path: '/tasks',
    desc: `Post work for people or bots. Mot Dang, Hongdam and Chiang Mai Visa Desk answer ${nKinds} kinds of work; pay can follow the market.`,
    body: `<h1>Tasks <span class="sub">งาน · คนหรือบอท</span></h1>
<p class="lede">Post work for people or bots. Mot Dang, Hongdam and Chiang Mai Visa Desk answer the ${nKinds} kinds they handle; anyone can answer.<br><span lang="th">ลงงานให้คนหรือบอททำ มดแดง หงส์ดำ และโต๊ะวีซ่าเชียงใหม่ตอบงาน ${nKinds} ประเภทที่รับ ใครก็ตอบได้</span></p>
${flash || ''}
<div class="go"><a class="btn" href="#post">Post a task · ลงงาน</a><a class="btn alt" href="#ours">Take one of ours · รับงานของเรา</a>${LAYERS.map((l) => `<a class="btn alt" href="/tasks/c/${l.id}">${e(l.en)} · ${e(l.th)}</a>`).join('')}</div>
${postForm()}
<section class="list" id="ours"><h2>Ours, open now <span>งานของเรา</span></h2><p>${ours.length} postings by Mot Dang, Hongdam and the Visa Desk · ${ours.length} งาน</p>
<div class="cards">${ours.map((t) => card(t, ans[t.id] || [], now)).join('')}</div></section>
<section class="list" id="people"><h2>Posted by people <span>งานที่คนโพสต์</span></h2><p>Posted here, or asked on other sites and linked · โพสต์ที่นี่ หรือถามไว้ที่เว็บอื่น</p>
<div class="cards">${people.map((t) => card(t, ans[t.id] || [], now)).join('') || '<p>None yet · ยังไม่มี</p>'}</div></section>
<section class="list" id="kinds"><h2>What we handle <span>งานที่เรารับ</span></h2><p>${ROOTS.length} groups, ${nKinds} kinds · <a href="/tasks/graph/">the graph · กราฟ</a></p><div class="kinds">${kinds}</div></section>
${FOLDS}`,
  })
}

async function kindPage(db, now, id) {
  const c = CAT[id]
  const group = !c.up
  const rows = await openTasks(db, now, { cat: id })
  const ans = await answersFor(db, rows.map((t) => t.id))
  const b = group ? null : await catBaht(db, id, now)
  const parent = c.up ? CAT[c.up] : null
  const lay = layerOf(id)
  const rel = (c.rel || []).concat(Object.values(CAT).filter((n) => (n.rel || []).includes(id)).map((n) => n.id))
  const who = c.who.map((o) => `<a class="btn alt" href="${lineUrl(`hongdam.net/tasks/c/${id} · ${c.en}: ${ORGS[o].en}, a question · สอบถาม`)}">${e(ORGS[o].en)} on LINE</a>`).join('')
  const said = group ? '' : c.who.map((o) => { const s = orgSays(o, id, b); return `<li>${e(s.en)} <span lang="th">${e(s.th)}</span></li>` }).join('')
  const sub = group ? `<div class="kinds">${KIDS[id].map((k) => `<a href="/tasks/c/${k.id}">${e(k.en)}<span lang="th">${e(k.th)}</span><i>${(BY[k.by] || BY.either)[0]}</i></a>`).join('')}</div>` : ''
  return page({
    title: `${c.en} · ${c.th} · Hongdam tasks`, path: `/tasks/c/${id}`,
    desc: `${c.en}${c.who.length ? `: answered by ${c.who.map((o) => ORGS[o].en).join(', ')}` : ''}. ${rows.length} open.`,
    body: `<div class="crumbs"><a href="/tasks">Tasks</a>${parent ? ` › <a href="/tasks/c/${parent.id}">${e(parent.en)}</a>` : ''}</div>
<h1>${e(c.en)} <span class="sub">${e(c.th)}</span></h1>
<div class="tags" style="margin:12px 0">${c.who.map((o) => `<span class="org">${e(ORGS[o].en)}</span>`).join('')}<span class="${c.by === 'both' ? '' : c.by}">${(BY[c.by] || BY.either)[0]} · ${(BY[c.by] || BY.either)[1]}</span>${c.href ? `<a href="${e(c.href)}">${e(new URL(c.href).hostname)} ↗</a>` : ''}</div>
${lay ? `<p class="about">${e(lay.about_en)}</p><p class="about" lang="th">${e(lay.about_th)}</p>` : ''}
${said ? `<ul class="ans" style="margin:10px 0 16px">${said}</ul>` : ''}
<div class="go"><a class="btn" href="#post">Post one · ลงงาน</a>${who}</div>
${sub}
${rows.length ? `<section class="list"><h2>Open <span>เปิดอยู่</span></h2><div class="cards">${rows.map((t) => card(t, ans[t.id] || [], now)).join('')}</div></section>` : ''}
${rel.length ? `<section class="list"><h2>Related <span>เกี่ยวข้อง</span></h2><div class="tags" style="font-size:14px">${[...new Set(rel)].map((r) => `<a href="/tasks/c/${r}">${e(CAT[r].en)}</a>`).join('')}</div></section>` : ''}
<section class="list"><h2>Post one <span>ลงงาน</span></h2>${postForm(group ? '' : id)}</section>`,
  })
}

function answerRow(t, a, own) {
  if (a.org) {
    const s = orgSays(a.org, t.cat, a.baht)
    const ask = lineUrl(`hongdam.net/tasks/${t.id} · ${t.title}\n${ORGS[a.org].en}${a.baht ? ` ${baht(a.baht)}` : ''}: yes, go ahead · ตกลง`)
    const act = own
      ? `<form method="post" class="inline"><input type="hidden" name="do" value="accept"><input type="hidden" name="answer" value="${a.id}"><button>Accept on LINE · ตกลง</button></form>`
      : `<a class="btn" href="${ask}">Ask ${e(ORGS[a.org].en)} on LINE · ถามทางไลน์</a>`
    return `<div class="answer"><span class="who">${e(ORGS[a.org].en)} <span lang="th">${e(ORGS[a.org].th)}</span></span><span>${e(s.en)} <span lang="th">${e(s.th)}</span></span>${a.note ? `<span class="note">${e(a.note)}</span>` : ''}${a.accepted_at ? '<span class="ok">accepted · ตกลงแล้ว</span>' : ''}<div>${act}</div></div>`
  }
  return `<div class="answer"><span class="who">${e(a.name)}${a.kind === 'take' ? ' · taking it · รับงาน' : ''}${a.baht ? ` · ${baht(a.baht)}` : ''}</span>${a.note ? `<span class="note">${e(a.note)}</span>` : ''}<span class="payline">${day(a.created_at)}</span>${own ? `<span>Contact · ติดต่อ: <b>${e(a.contact)}</b></span>${a.accepted_at ? '<span class="ok">accepted · ตกลงแล้ว</span>' : `<form method="post" class="inline"><input type="hidden" name="do" value="accept"><input type="hidden" name="answer" value="${a.id}"><button>Accept · ตกลง</button></form>`}` : ''}</div>`
}

async function taskPage(db, now, t, { own, flash } = {}) {
  const ans = (await answersFor(db, [t.id]))[t.id] || []
  const c = CAT[t.cat], parent = c.up ? CAT[c.up] : null
  const s = shoup(t, ans, now)
  const startB = t.baht ? L[rungOf(t.baht)] : (await catBaht(db, t.cat, now)) ?? 500
  const shoupBox = s ? `<details class="fold"><summary>Shoup: opened at ${baht(s.opened)}, moves between ${baht(s.floor)} and ${baht(s.ceiling)}${s.next ? `, next check ${day(s.next)}` : ''}</summary>
<table class="steps"><tr><th>Week</th><th>${t.src === 'ours' ? 'Taken' : 'Answers'}</th><th>Of</th><th>Pay</th></tr>${s.steps.map((x) => `<tr><td>${x.week} · ${day(x.from)}</td><td>${x.n}</td><td>${x.slots}</td><td>${baht(x.baht)} ${x.move > 0 ? '▲' : x.move < 0 ? '▼' : ''}</td></tr>`).join('') || `<tr><td colspan="4">First check ${s.next ? day(s.next) : ''}</td></tr>`}</table></details>` : ''
  const offer = t.src === 'user' && t.price_kind !== 'shoup'
    ? (own ? `<div class="box own"><h2>Let the market set the pay? · ให้ตลาดตั้งค่าจ้างไหม</h2><p>Shoup: up a step each week fewer than two answer, down a step when three or more do, at most three steps from the start. It opens at ${baht(startB)}.</p><form method="post" style="margin-top:10px"><input type="hidden" name="do" value="shoup"><button>Shoupify · ใช้ราคาตลาด</button></form></div>`
      : '<p class="payline">The poster can hand this price to the market (Shoup) from their own link. · ผู้โพสต์เปลี่ยนเป็นราคาตลาดได้จากลิงก์ของตัวเอง</p>')
    : ''
  const ownBox = own ? `<div class="box own"><h2>Your page · หน้าของคุณ</h2><p>This link shows who answered and how to reach them. · ลิงก์นี้แสดงว่าใครตอบและติดต่อทางไหน</p>
<p style="word-break:break-all;color:var(--cream)">${ORIGIN}/tasks/${t.id}/k/${e(t.token)}</p>
<div class="go" style="margin:10px 0 0">${t.price_kind === 'shoup' ? '<form method="post" class="inline"><input type="hidden" name="do" value="fixed"><button class="btn alt">Fix the price here · ล็อกราคานี้</button></form>' : ''}
<form method="post" class="inline"><input type="hidden" name="do" value="taken"><button>Done, someone took it · มีคนรับแล้ว</button></form>
<form method="post" class="inline"><input type="hidden" name="do" value="close"><button class="btn alt">Close · ปิด</button></form></div>
${t.state === 'held' ? '<p style="margin-top:8px">Waiting for a person to read it before it shows. · รอคนอ่านก่อนแสดง</p>' : ''}</div>` : ''
  const form = t.state !== 'open' ? '' : t.src === 'ours'
    ? `<section class="list" id="take"><h2>I'll do it <span>รับงาน</span></h2><form class="post" method="post" action="/tasks/${t.id}/answers">
<div class="row"><label>Name · ชื่อ<input name="name" required maxlength="60"></label><label>Reach you on · ติดต่อทาง<input name="contact" required maxlength="120" placeholder="LINE, phone, email · ไลน์ เบอร์ อีเมล"></label></div>
<label>Note · หมายเหตุ<textarea name="note" maxlength="600" placeholder="When, where, how many · เมื่อไร ที่ไหน กี่ชิ้น"></textarea></label><div><button>Take it · รับงาน</button></div></form></section>`
    : `<section class="list" id="answer"><h2>Answer <span>ตอบ</span></h2><form class="post" method="post" action="/tasks/${t.id}/answers">
<div class="row"><label>Name · ชื่อ<input name="name" required maxlength="60"></label><label>Your price, baht · ราคา (บาท)<input name="baht" inputmode="decimal"></label></div>
<label>Note · หมายเหตุ<textarea name="note" maxlength="600"></textarea></label>
<label>Reach you on (the poster sees this) · ติดต่อทาง (ผู้โพสต์เห็น)<input name="contact" required maxlength="120"></label><div><button>Answer · ตอบ</button></div></form></section>`
  const start = t.src === 'ours' && t.href ? `<a class="btn" href="${e(t.href)}">Start · เริ่ม</a><a class="btn alt" href="#take">I'll do it · รับงาน</a>`
    : t.src === 'elsewhere' ? `<a class="btn alt" href="${e(t.href)}" rel="nofollow noopener">${seenOn(t)[0]} ${e(t.site)} ↗</a>` : ''
  return page({
    title: `${t.title} · Hongdam tasks`, path: `/tasks/${t.id}`, noindex: own || t.state === 'held',
    desc: `${c.en}${t.place ? ` · ${t.place}` : ''}. ${(t.what || t.title).slice(0, 140)}`,
    body: `<div class="crumbs"><a href="/tasks">Tasks</a>${parent ? ` › <a href="/tasks/c/${parent.id}">${e(parent.en)}</a>` : ''} › <a href="/tasks/c/${c.id}">${e(c.en)}</a></div>
${flash || ''}${ownBox}
<h1 style="font-size:clamp(28px,5vw,40px)">${e(t.title)}${t.title_th ? `<span class="sub">${e(t.title_th)}</span>` : ''}</h1>
<div style="margin:14px 0">${tags(t)}</div>
${payOf(t, ans, now)}${shoupBox}
<p class="payline" style="margin-top:8px">${t.src === 'ours' ? `Posted by ${e(ORGS[t.org].en)}` : t.src === 'elsewhere' ? `${t.poster && t.poster !== t.site ? `${e(t.poster)} · ` : ''}${seenOn(t)[0]} ${e(t.site)}` : `Posted${t.poster ? ` by ${e(t.poster)}` : ''}`} · ${day(t.created_at)}${t.ends_at ? ` · until ${day(t.ends_at)}` : ''}${t.state !== 'open' ? ` · ${e(t.state)}` : ''}</p>
${t.what ? `<p class="what">${e(t.what)}</p>` : ''}${t.what_th ? `<p class="what th" lang="th">${e(t.what_th)}</p>` : ''}
${layerOf(t.cat) ? `<p class="payline">${e(layerOf(t.cat).about_en)}<br><span lang="th">${e(layerOf(t.cat).about_th)}</span></p>` : ''}
${start ? `<div class="go">${start}</div>` : ''}
${offer}
${ans.length ? `<section class="list"><h2>${t.src === 'ours' ? 'Taking it' : 'Answers'} <span>${t.src === 'ours' ? 'คนรับงาน' : 'คำตอบ'}</span></h2><div class="box">${ans.map((a) => answerRow(t, a, own)).join('')}</div></section>` : ''}
${form}`,
  })
}

const flashOk = (en, th) => `<p class="flash">${e(en)} · <span lang="th">${e(th)}</span></p>`
const flashErr = (msg) => `<p class="flash err">${e(msg)}</p>`

// ── routes ────────────────────────────────────────────────────────────────
// A job ad copied from a Facebook group was posted there; an ask from ask.in.th was asked there.
const seenOn = (t) => (t.cat || '').startsWith('jobs') ? ['Posted on', 'ลงไว้ที่'] : ['Asked on', 'ถามไว้ที่']

export async function onRequest(ctx) {
  const { request, env, params } = ctx
  const path = [].concat(params.path || [])
  if (path[0] === 'graph' || path[0] === 'graph.json') return ctx.next()
  if (!env.TASKS) return ctx.next()
  const db = env.TASKS, now = Date.now(), m = request.method
  const url = new URL(request.url)
  const [a, b, c] = path

  if (!a) {
    if (m === 'POST') {
      const r = await createTask(ctx, await readBody(request))
      if (r.error) return board(db, now, flashErr(r.error))
      return Response.redirect(`${url.origin}/tasks/${r.id}/k/${r.token}?posted=1`, 303)
    }
    return board(db, now)
  }
  if (a === 'c' && b && CAT[b]) return kindPage(db, now, b)
  const id = Number(a)
  if (!Number.isInteger(id) || id < 1) return ctx.next()

  if (b === 'answers' && m === 'POST') {
    const r = await createAnswer(ctx, id, await readBody(request))
    const t = await db.prepare("SELECT * FROM task WHERE id = ? AND state != 'held'").bind(id).first()
    if (!t) return ctx.next()
    if (r.error) return taskPage(db, now, t, { flash: flashErr(r.error) })
    return Response.redirect(`${url.origin}/tasks/${id}?${r.kind === 'take' ? 'took' : 'answered'}=1`, 303)
  }
  if (b === 'k' && c) {
    const t = await ownTask(db, id, c)
    if (!t) return ctx.next()
    if (m === 'POST') {
      const r = await ownerAct(ctx, t, await readBody(request))
      if (r.line) return Response.redirect(r.line, 303)
      return Response.redirect(`${url.origin}/tasks/${id}/k/${c}`, 303)
    }
    const flash = url.searchParams.get('posted') ? flashOk(t.state === 'held' ? 'Posted. It shows once a person has read it.' : 'Posted. Mot Dang, Hongdam or the Visa Desk answered below where it is theirs.', t.state === 'held' ? 'ลงแล้ว จะแสดงเมื่อมีคนอ่าน' : 'ลงแล้ว คำตอบอยู่ด้านล่าง') : ''
    return taskPage(db, now, t, { own: true, flash })
  }
  if (b) return ctx.next()
  const t = await db.prepare("SELECT * FROM task WHERE id = ? AND state != 'held'").bind(id).first()
  if (!t) return ctx.next()
  const flash = url.searchParams.get('took') ? flashOk('Taken. The team has your contact.', 'รับงานแล้ว ทีมได้ช่องทางติดต่อของคุณแล้ว')
    : url.searchParams.get('answered') ? flashOk('Answer posted. The poster sees your contact.', 'ตอบแล้ว ผู้โพสต์เห็นช่องทางติดต่อของคุณ') : ''
  return taskPage(db, now, t, { flash })
}
