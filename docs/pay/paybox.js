// paybox.js — the payment box any NaNoBotCo page can carry (Nan 2026-10-12).
//
//   <div data-paybox data-payee="0988239210" data-ref="HD-TR" data-lang="en"
//        data-verify="/api/pay/verify" data-line="@964yxgnk"
//        data-prices='{"new":[1500,5,500],"check":[500,5,150],"stamp":100}'></div>
//   <script type="module" src="/pay/paybox.js"></script>
//
// The reader picks the service and the page count; the box works out the price,
// draws a PromptPay QR with that exact amount, and takes the slip. The server
// works the price out again from the same choices and asks SlipOK; the amount
// typed in a browser is not what gets checked. With no slip check behind it, the
// box offers the LINE account for the slip instead.
import { promptPayPayload } from './promptpay.js'
import { qrToSvg } from './qr.js'
import { price } from './price.js'

const T = {
  en: { service: 'Service', new: 'New translation', check: 'Checking a translation', pages: 'Pages', stamp: 'Stamp each page',
        total: 'To pay', how: 'Scan with any Thai banking app. The app shows the name the money goes to before you pay.',
        slip: 'After paying, upload the slip from your banking app:', checkBtn: 'Check my payment', checking: 'Checking…',
        paid: 'Paid. Your reference is', keep: 'Send it with your documents.', line: 'Send the slip on LINE',
        err: { nofile: 'Choose the slip picture first.', unread: 'That picture is not a readable bank slip.',
               amount: 'The slip shows a different amount.', receiver: 'The slip shows a different receiver.',
               used: 'That slip has paid already.', late: 'That slip is too old to check.',
               service: 'The slip check is not answering. Try again in a minute.' } },
  th: { service: 'บริการ', new: 'แปลใหม่', check: 'ตรวจคำแปล', pages: 'จำนวนหน้า', stamp: 'ประทับตราทุกหน้า',
        total: 'ยอดชำระ', how: 'สแกนด้วยแอปธนาคารใดก็ได้ แอปจะแสดงชื่อผู้รับเงินก่อนกดโอน',
        slip: 'โอนแล้ว อัปโหลดสลิปจากแอปธนาคาร:', checkBtn: 'ตรวจการชำระเงิน', checking: 'กำลังตรวจ…',
        paid: 'ชำระแล้ว เลขอ้างอิงของคุณคือ', keep: 'ส่งเลขนี้มาพร้อมเอกสาร', line: 'ส่งสลิปทางไลน์',
        err: { nofile: 'เลือกรูปสลิปก่อน', unread: 'รูปนี้อ่านเป็นสลิปไม่ได้', amount: 'ยอดในสลิปไม่ตรง',
               receiver: 'ผู้รับในสลิปไม่ตรง', used: 'สลิปนี้ใช้ชำระไปแล้ว', late: 'สลิปนี้เก่าเกินกว่าจะตรวจได้',
               service: 'ระบบตรวจสลิปไม่ตอบ ลองใหม่อีกครั้งในอีกสักครู่' } },
  my: { service: 'ဝန်ဆောင်မှု', new: 'ဘာသာပြန်အသစ်', check: 'ဘာသာပြန်ကို စစ်ဆေးခြင်း', pages: 'စာမျက်နှာ', stamp: 'စာမျက်နှာတိုင်း တံဆိပ်တုံးထု',
        total: 'ပေးရန်', how: 'ထိုင်းဘဏ်အက်ပ်တစ်ခုခုဖြင့် စကင်ဖတ်ပါ။ မပေးမီ ငွေလက်ခံသူအမည်ကို အက်ပ်က ပြပါမည်။',
        slip: 'ငွေလွှဲပြီးလျှင် ဘဏ်အက်ပ်မှ ငွေလွှဲစလစ်ကို တင်ပါ:', checkBtn: 'ငွေပေးချေမှု စစ်ရန်', checking: 'စစ်နေသည်…',
        paid: 'ပေးချေပြီး။ သင့်ရည်ညွှန်းနံပါတ်မှာ', keep: 'စာရွက်စာတမ်းများနှင့်အတူ ပို့ပါ။', line: 'LINE ဖြင့် စလစ်ပို့ရန်',
        err: { nofile: 'စလစ်ပုံကို အရင်ရွေးပါ။', unread: 'ဤပုံကို ဘဏ်စလစ်အဖြစ် ဖတ်၍မရပါ။', amount: 'စလစ်ပေါ်ရှိ ငွေပမာဏ မကိုက်ညီပါ။',
               receiver: 'စလစ်ပေါ်ရှိ လက်ခံသူ မကိုက်ညီပါ။', used: 'ဤစလစ်ဖြင့် ပေးချေပြီးသားဖြစ်သည်။', late: 'ဤစလစ်သည် စစ်ရန် ဟောင်းလွန်းသည်။',
               service: 'စလစ်စစ်စနစ် မတုံ့ပြန်ပါ။ ခဏနေ ထပ်စမ်းပါ။' } },
}

const CSS = `[data-paybox]{border:2px solid currentColor;border-radius:12px;padding:1rem;max-width:30rem;margin:1rem 0}
[data-paybox] fieldset{border:0;padding:0;margin:0 0 .6rem}[data-paybox] legend{font-weight:700;margin-bottom:.3rem}[data-paybox] label{display:flex;align-items:center;gap:.5rem;margin:.35rem 0;text-transform:none;letter-spacing:0;font-size:1rem}[data-paybox] input[type=radio],[data-paybox] input[type=checkbox]{width:1.2rem;height:1.2rem;margin:0;display:inline-block;flex:none}
[data-paybox] input[type=number]{width:5rem;font:inherit;padding:.3rem}
[data-paybox] .amt{font-size:1.6rem;font-weight:700;margin:.4rem 0}
[data-paybox] .qr svg{display:block;width:220px;height:220px;background:#fff;border-radius:6px}
[data-paybox] button,[data-paybox] .btn{font:inherit;min-height:44px;padding:.5rem .9rem;border-radius:8px;border:2px solid currentColor;background:#f3c34b;color:#000;cursor:pointer;display:inline-block;text-decoration:none}
[data-paybox] .err{color:#b3261e;font-weight:700}[data-paybox] .ok{font-weight:700}`

function mount(el) {
  const t = T[el.dataset.lang] || T.en
  const prices = JSON.parse(el.dataset.prices)
  const payee = el.dataset.payee, ref = el.dataset.ref || 'PAY', verify = el.dataset.verify || '', line = el.dataset.line || ''
  el.innerHTML = `<style>${CSS}</style>
<fieldset><legend>${t.service}</legend>
 <label><input type="radio" name="svc" value="new" checked> ${t.new}</label>
 <label><input type="radio" name="svc" value="check"> ${t.check}</label></fieldset>
<label>${t.pages} <input type="number" name="pages" min="1" max="200" value="1"></label>
<label><input type="checkbox" name="stamp"> ${t.stamp}</label>
<p>${t.total}</p><p class="amt" aria-live="polite"></p><div class="qr"></div><p>${t.how}</p>
<form class="slipf" hidden><label>${t.slip}<input type="file" name="slip" accept="image/*" required></label>
 <button type="submit">${t.checkBtn}</button><p class="msg" role="status"></p></form>
${line ? `<p class="linep"><a class="btn" href="https://line.me/R/ti/p/${line}">${t.line}</a></p>` : ''}`
  const choice = () => ({ svc: el.querySelector('[name=svc]:checked').value,
    pages: Math.max(1, Math.min(200, parseInt(el.querySelector('[name=pages]').value, 10) || 1)),
    stamp: el.querySelector('[name=stamp]').checked })
  const draw = () => {
    const c = choice(), baht = price(prices, c)
    el.querySelector('.amt').textContent = '฿' + baht.toLocaleString('en-US')
    el.querySelector('.qr').innerHTML = qrToSvg(promptPayPayload({ payeeId: payee, satang: baht * 100, merchantName: 'NaNoBotCo', ref }),
      { ecl: 'M', border: 4, scale: 6, dark: '#000', light: '#fff', title: `PromptPay ${baht} THB` })
  }
  el.addEventListener('input', draw); draw()
  if (!verify) return
  // Show the upload only when the server says the slip check is on.
  fetch(verify, { method: 'GET' }).then((r) => r.json()).then((j) => {
    if (!j.on) return
    const f = el.querySelector('.slipf'); f.hidden = false
    const lp = el.querySelector('.linep'); if (lp) lp.hidden = true
    f.addEventListener('submit', async (e) => {
      e.preventDefault()
      const msg = f.querySelector('.msg'), file = f.slip.files[0]
      if (!file) { msg.className = 'msg err'; msg.textContent = t.err.nofile; return }
      msg.className = 'msg'; msg.textContent = t.checking
      const fd = new FormData(); const c = choice()
      fd.append('slip', file); fd.append('svc', c.svc); fd.append('pages', c.pages); fd.append('stamp', c.stamp ? '1' : '')
      try {
        const j2 = await (await fetch(verify, { method: 'POST', body: fd })).json()
        if (j2.ok) { msg.className = 'msg ok'; msg.textContent = `${t.paid} ${j2.ref}. ${t.keep}` }
        else { msg.className = 'msg err'; msg.textContent = t.err[j2.why] || t.err.unread }
      } catch { msg.className = 'msg err'; msg.textContent = t.err.service }
    })
  }).catch(() => {})
}

document.querySelectorAll('[data-paybox]').forEach(mount)
