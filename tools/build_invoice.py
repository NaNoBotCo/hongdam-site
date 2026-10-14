#!/usr/bin/env python3
"""Hongdam invoice pages: docs/invoice/<slug>/index.html, one per entry in data/invoices.json.

    python3 tools/build_invoice.py

Each page is unlisted (random slug, noindex) and carries its own pay links.
"""
import html, json, pathlib, segno, io

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "invoices.json"
OUT = ROOT / "docs" / "invoice"

PAYPAL = "https://www.paypal.me/pfauhaus"
BTC = "bc1qtgkvch2dgf9q5dwl2xfuseckyv6cqd2mlefjzz"
WISE = "https://wise.com/pay/me/annikahonorahp"

e = html.escape


def qr_svg(data):
    buf = io.BytesIO()
    segno.make(data, error="m").save(buf, kind="svg", scale=5, border=2,
                                    dark="#171009", light="#f2e7d3", xmldecl=False, svgns=True)
    return buf.getvalue().decode()


def money(v):
    return f"US${v:,.2f}"


def page(inv):
    total = sum(i["amount"] for i in inv["items"])
    rows = "".join(
        f'<tr><td><b>{e(i["name"])}</b><span>{e(i.get("detail", ""))}</span></td>'
        f'<td class="n">{"no charge" if i["amount"] == 0 else money(i["amount"])}</td></tr>'
        for i in inv["items"])
    bill = "<br>".join(e(l) for l in inv["bill_to"])
    notes = "".join(f"<p>{e(n)}</p>" for n in inv.get("notes", []))
    whole = int(total) if total == int(total) else total
    ways = [f'<a class="pay" href="{PAYPAL}/{whole}USD" target="_blank" rel="noopener">Pay {money(total)} with PayPal</a>']
    ln = inv.get("lightning")
    if ln:
        ways.append(
            f'<div class="way"><h3>Lightning</h3><div class="qr">{qr_svg("lightning:" + ln)}</div>'
            f'<p>{money(total)} in sats at the day\'s rate, to</p>'
            f'<p><code>{e(ln)}</code> <button data-copy="{e(ln)}">Copy</button></p>'
            f'<a class="pay alt" href="lightning:{e(ln)}">Open in a Lightning wallet</a></div>')
    ways.append(
        f'<div class="way"><h3>Bitcoin</h3><div class="qr">{qr_svg("bitcoin:" + BTC)}</div>'
        f'<p>{money(total)} in BTC at the day\'s rate, to</p>'
        f'<p><code>{BTC}</code> <button data-copy="{BTC}">Copy</button></p></div>')
    ways.append(
        f'<div class="way"><h3>Wise</h3><p>Card or bank, most currencies: '
        f'<a href="{WISE}" target="_blank" rel="noopener">{WISE.removeprefix("https://")}</a></p></div>')
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Invoice {e(inv["number"])} · Hongdam</title>
<meta name="theme-color" content="#171009">
<link rel="icon" href="/assets/favicon.svg">
<link rel="stylesheet" href="/assets/rt.css">
<style>
  .inv{{max-width:760px}}
  .head{{display:flex; justify-content:space-between; flex-wrap:wrap; gap:18px; margin:8px 0 34px}}
  .head dl{{display:grid; grid-template-columns:auto auto; gap:2px 18px; font-size:16px}}
  .head dt{{color:var(--cream-dim)}}
  .label{{font-size:13px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:6px}}
  table{{width:100%; border-collapse:collapse; margin:28px 0 8px}}
  td{{padding:14px 0; border-top:1px solid var(--line); vertical-align:top}}
  td span{{display:block; color:var(--cream-dim); font-size:16px}}
  td.n{{text-align:right; white-space:nowrap; padding-left:16px}}
  tr.total td{{border-top:2px solid var(--gold-deep); font-family:Georgia,serif; font-size:26px; color:var(--gold)}}
  .notes p{{color:var(--cream-dim); font-size:16px; margin-top:6px}}
  .pay{{display:inline-block; background:var(--gold); color:#000; font-weight:700; border-radius:10px; padding:14px 22px; margin:18px 0 6px; font-size:19px}}
  .pay:hover{{color:#000; background:var(--cream)}}
  .pay.alt{{font-size:16px; padding:10px 16px}}
  .way{{border-top:1px solid var(--line); padding:18px 0}}
  .way h3{{font-size:18px; color:var(--cream)}}
  .way p{{color:var(--cream-dim); font-size:16px}}
  .qr svg{{width:150px; height:150px; margin:10px 0; border-radius:6px}}
  code{{overflow-wrap:anywhere; color:var(--cream)}}
  button{{background:none; border:1px solid var(--line); color:var(--gold); border-radius:6px; padding:2px 10px; font:inherit; font-size:14px; cursor:pointer}}
  @media print{{
    body{{background:#fff; color:#000}} .label,td span,.notes p,.way p,.head dt{{color:#333}}
    h1,tr.total td{{color:#000}} .pay,button,.top{{display:none}} code{{color:#000}}
  }}
</style>
</head>
<body>
<header class="top"><a class="mark" href="/">HONGDAM</a></header>
<main class="inv">
<h1>Invoice {e(inv["number"])}</h1>
<div class="head">
  <div><div class="label">Bill to</div><p>{bill}</p></div>
  <dl><dt>Issued</dt><dd>{e(inv["issued"])}</dd><dt>Due</dt><dd>{e(inv["due"])}</dd>
  <dt>From</dt><dd>Hongdam · beer@motdang.net</dd></dl>
</div>
<table>{rows}<tr class="total"><td>Total due</td><td class="n">{money(total)}</td></tr></table>
<div class="notes">{notes}</div>
<section>
<div class="label">Pay</div>
{"".join(ways)}
<p class="note">Reference <code>{e(inv["number"])}</code></p>
</section>
</main>
<script>
document.querySelectorAll('button[data-copy]').forEach(b=>b.onclick=()=>{{
  navigator.clipboard.writeText(b.dataset.copy).then(()=>{{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1500)}});
}});
</script>
</body>
</html>
"""


def main():
    for inv in json.loads(DATA.read_text()):
        d = OUT / inv["slug"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page(inv))
        print(f"https://hongdam.net/invoice/{inv['slug']}/")


if __name__ == "__main__":
    main()
