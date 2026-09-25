#!/usr/bin/env python3
"""Render the portfolio into docs/index.html from data/work.json.

Numbers are read at build time, never typed into the page by hand:

  count:  "index:<key>"                 a value from the index's counts.json
          "api:<url>:<key|len>"         a live JSON endpoint
  stated: a figure the site itself publishes; the string in "verify" must
          appear on the live page or the pill is dropped and the build says so.

Writes between the markers:
  <!-- WORK:START -->  ... <!-- WORK:END -->
  <!-- BENCH:START --> ... <!-- BENCH:END -->

    python3 tools/build_work.py            # build, fetching what it needs
    python3 tools/build_work.py --offline  # build from data/counts.cache.json
"""
import html
import json
import os
import re
import sys
import urllib.request
from datetime import date

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(HERE, "data", "work.json")
CACHE = os.path.join(HERE, "data", "counts.cache.json")
PAGE = os.path.join(HERE, "docs", "index.html")
INDEX_COUNTS = os.path.expanduser(
    "~/Developer/claude code projects/index/data/counts.json")
SHOTS = os.path.join(HERE, "docs", "assets", "screens")

OFFLINE = "--offline" in sys.argv
UA = {"User-Agent": "hongdam-build/1.0 (+https://hongdam.net/)"}
warnings = []


class Redirect308(urllib.request.HTTPRedirectHandler):
    """Python 3.9's opener stops at a 308; Cloudflare hands them out freely."""

    def http_error_308(self, req, fp, code, msg, headers):
        return self.http_error_301(req, fp, 301, msg, headers)


OPENER = urllib.request.build_opener(Redirect308)


def fetch(url, timeout=90):
    req = urllib.request.Request(url, headers=UA)
    with OPENER.open(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def group(n):
    return f"{n:,}"


class Counts:
    """Every number on the page, with where it came from."""

    def __init__(self):
        self.cache = {}
        if os.path.exists(CACHE):
            self.cache = json.load(open(CACHE, encoding="utf-8")).get("values", {})
        self.fresh = {}
        self.index = {}
        if os.path.exists(INDEX_COUNTS):
            self.index = json.load(open(INDEX_COUNTS, encoding="utf-8"))["counts"]

    def get(self, spec):
        if spec.startswith("index:"):
            key = spec[6:]
            row = self.index.get(key)
            if row and row.get("value") is not None:
                v = int(row["value"])
                self.fresh[spec] = {"value": v, "source": row.get("source", INDEX_COUNTS),
                                    "method": row.get("method"), "read": row.get("read")}
                return v
            warnings.append(f"no index count for {key}")
            return self._cached(spec)
        if spec.startswith("api:"):
            url, key = spec[4:].rsplit(":", 1)
            if OFFLINE:
                return self._cached(spec)
            try:
                d = json.loads(fetch(url))
            except Exception as e:                       # noqa: BLE001
                warnings.append(f"{url}: {e}")
                return self._cached(spec)
            v = len(d) if key == "len" else d.get(key)
            if v is None:
                warnings.append(f"{url}: no key {key}")
                return self._cached(spec)
            v = int(v)
            self.fresh[spec] = {"value": v, "source": url, "method": "json",
                                "read": str(date.today())}
            return v
        raise ValueError(spec)

    def _cached(self, spec):
        row = self.cache.get(spec)
        if not row:
            return None
        warnings.append(f"using cached value for {spec} (read {row.get('read')})")
        self.fresh[spec] = row
        return row["value"]

    def save(self):
        merged = dict(self.cache)
        merged.update(self.fresh)
        json.dump({"read": str(date.today()), "values": merged},
                  open(CACHE, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


class Pages:
    """One fetch per live page, for verifying the figures a site publishes."""

    def __init__(self):
        self.seen = {}

    def text(self, url):
        if url not in self.seen:
            if OFFLINE:
                self.seen[url] = None
            else:
                try:
                    self.seen[url] = fetch(url)
                except Exception as e:                   # noqa: BLE001
                    warnings.append(f"{url}: {e}")
                    self.seen[url] = None
        return self.seen[url]

    def carries(self, url, needle):
        body = self.text(url)
        if body is None:
            return None                                  # unknown, not false
        flat = re.sub(r"\s+", " ", html.unescape(body))
        return needle.lower() in flat.lower()


def pill(inner, cls="pill"):
    return f'<span class="{cls}">{inner}</span>'


def facts_html(card, counts, pages):
    out = []
    for f in card.get("facts", []):
        if "text" in f:
            out.append(pill(html.escape(f["text"]), "pill soft"))
        elif "count" in f:
            v = counts.get(f["count"])
            if v is None:
                continue
            out.append(pill(f'<b>{group(v)}</b> {html.escape(f["label"])}'))
        elif "stated" in f:
            ok = pages.carries(card["url"], f["verify"])
            if ok is False:
                warnings.append(
                    f'{card["id"]}: "{f["verify"]}" is no longer on {card["url"]} — pill dropped')
                continue
            if ok is None:
                warnings.append(f'{card["id"]}: could not verify "{f["verify"]}"')
            out.append(pill(f'<b>{html.escape(f["stated"])}</b> {html.escape(f["label"])}'))
    if not out:
        return ""
    return '<div class="facts">' + "".join(out) + "</div>"


def shot_html(card):
    """The screenshot, as a link to the page it is a picture of. Four layers, bottom to
    top: the screenshot as a background, a scrim under the words, a spacer that gives the
    box its height, and the name over both."""
    slug = card["shot"]
    src = f"assets/screens/{slug}.webp"
    path = os.path.join(SHOTS, slug + ".webp")
    if not os.path.exists(path):
        warnings.append(f'{card["id"]}: missing {src}')
    w, h = (1280, 900) if card.get("feat") else (1160, 816)
    dest = re.sub(r"^https?://|/$", "", card["url"])
    label = f'{card["name"]} — open the live page at {dest}'
    return (f'<h3 class="shot-h"><a class="shot" href="{card["url"]}" '
            f'aria-label="{html.escape(label)}">'
            f'<span class="bg drift" style="aspect-ratio:{w}/{h};'
            f'background-image:url({src})"></span>'
            f'<span class="scrim"></span><span class="sp"></span>'
            f'<span class="tx">{html.escape(card["name"])}'
            f'<span class="d">{html.escape(dest)}</span></span></a></h3>')


def card_html(card, counts, pages, n):
    cls = ["work", "reveal"]
    if card.get("feat"):
        cls.append("feat")
    if n % 3 == 1:
        cls.append("d1")
    elif n % 3 == 2:
        cls.append("d2")
    also = ""
    if card.get("also"):
        links = " · ".join(
            f'<a href="{a["url"]}">{html.escape(a["text"])} →</a>' for a in card["also"])
        also = f'<div class="also">Also inside: {links}</div>'
    dest = re.sub(r"^https?://|/$", "", card["url"])
    return f"""      <article class="{' '.join(cls)}">
        <div class="chrome" aria-hidden="true"><span class="dots"><i></i><i></i><i></i></span><span class="url">{html.escape(card['chrome'])}</span></div>
        {shot_html(card)}
        <div class="work-body">
          <div class="th" lang="th">{card['th']}</div>
          {facts_html(card, counts, pages)}
          <p>{html.escape(card['body'])}</p>
          <a class="go" href="{card['url']}"><span lang="th">เปิดดู</span> · {html.escape(dest)} →</a>
          {also}
        </div>
      </article>"""


def build_work(data, counts, pages):
    lanes = data["lanes"]
    by_lane = {l["id"]: [c for c in data["cards"] if c["lane"] == l["id"]] for l in lanes}
    total = sum(len(v) for v in by_lane.values())

    rail = ['<div class="lanes" role="group" aria-label="Filter the portfolio by kind">',
            f'<button class="lane on" data-lane="all" aria-pressed="true">All <b>{total}</b></button>']
    for l in lanes:
        rail.append(f'<button class="lane" data-lane="{l["id"]}" aria-pressed="false">{html.escape(l["name"])} '
                    f'<b>{len(by_lane[l["id"]])}</b></button>')
    rail.append("</div>")

    head = f'''    <div class="reveal">
      <div class="sec-kick">The portfolio</div>
      <h2>{total} live addresses, photographed for this page</h2>
      <div class="sec-th" lang="th">ผลงานทั้งหมด {total} ที่อยู่ · ถ่ายจากหน้าจริง</div>
      <p class="sec-sub">Platforms, directories, apps and instruments — every frame below is a
      screenshot of the production page, taken on {data.get("read", date.today())}. Pick a shelf, or take the lot in order.</p>
    </div>'''

    out = ["<!-- WORK:START -->", head, "\n".join(rail)]
    n = 0
    for l in lanes:
        cards = by_lane[l["id"]]
        if not cards:
            continue
        small = " small" if all(c.get("small") for c in cards) else ""
        out.append(f'''
    <div class="shelf" data-lane="{l['id']}">
      <div class="shelf-head reveal">
        <div class="sec-kick">{html.escape(l['kick'])}</div>
        <h3 class="shelf-title">{html.escape(l['head'])}</h3>
        <div class="sec-th" lang="th">{l['th']} · {len(cards)} รายการ</div>
        <p class="sec-sub">{html.escape(l['sub'])}</p>
      </div>
      <div class="works{small}">''')
        for c in cards:
            out.append(card_html(c, counts, pages, n))
            n += 1
        out.append("      </div>\n    </div>")
    out.append("<!-- WORK:END -->")
    return "\n".join(out)




LLMS = os.path.join(HERE, "docs", "llms.txt")


def build_llms(data, counts, pages):
    """The same portfolio, as plain text, for whatever reads the site that way."""
    lines = ["<!-- WORK:START -->"]
    for lane in data["lanes"]:
        cards = [c for c in data["cards"] if c["lane"] == lane["id"]]
        if not cards:
            continue
        lines.append(f"\n## {lane['name']} ({len(cards)})\n")
        lines.append(lane["sub"] + "\n")
        for c in cards:
            bits = []
            for f in c.get("facts", []):
                if "count" in f:
                    v = counts.get(f["count"])
                    if v is not None:
                        bits.append(f"{group(v)} {f['label']}")
                elif "stated" in f:
                    bits.append(f"{f['stated']} {f['label']}")
            tail = (" — " + "; ".join(bits)) if bits else ""
            lines.append(f"- {c['url']} — {c['name']} {c['th']}: {c['body']}{tail}")
    lines.append("\n<!-- WORK:END -->")
    return "\n".join(lines)


def build_shop(data, counts):
    w = data["workshop"]
    out = [f'''    <div class="reveal">
      <div class="sec-kick">{html.escape(w['kick'])}</div>
      <h2>{html.escape(w['head'])}</h2>
      <div class="sec-th" lang="th">{w['th']}</div>
      <p class="sec-sub">{html.escape(w['sub'])}</p>
    </div>
    <div class="shop reveal">''']
    for g in w["groups"]:
        out.append(f'      <div class="shop-group"><div class="g-title">{html.escape(g["title"])} '
                   f'<span lang="th">{g["th"]}</span></div>')
        chips = []
        for c in g["chips"]:
            label = html.escape(c["text"])
            if "count" in c:
                v = counts.get(c["count"])
                if v is not None:
                    label += f' — <b>{group(v)}</b> {html.escape(c["unit"])}'
            chips.append(f'<span class="chip">{label}</span>')
        out.append('        <div class="chips">' + "".join(chips) + "</div></div>")
    out.append(f'    </div>\n    <p class="shop-note">{html.escape(w["note"])}</p>')
    return "<!-- SHOP:START -->\n" + "\n".join(out) + "\n<!-- SHOP:END -->"


BENCH_ROWS = [
    ("Place records in the city directory", "หน้าสถานที่ในสารบัญเมือง", "index:motdang#0"),
    ("Lanna manuscripts archived", "ใบลานในหอจดหมายเหตุ", "index:lanna-manuscripts#0"),
    ("Manuscript page images", "ภาพหน้าใบลาน", "index:lanna-manuscripts#1"),
    ("Amulet listings read from the market", "ประกาศตลาดพระที่อ่านแล้ว", "index:amulet-market#0"),
    ("Pages on motdang.net", "หน้าบนมดแดง", "index:site:motdang.net"),
    ("Pages on wichaa.net", "หน้าบนวิชา", "index:site:wichaa.net"),
]


def build_bench(counts, when, data):
    rows = ["        <div class=\"brow\"><span class=\"lbl\"><b>Live addresses in the portfolio</b>"
            "<span lang=\"th\">ที่อยู่ที่เปิดอยู่จริง</span></span>"
            f'<span class="flap" data-flap="{len(data["cards"])}"></span></div>']
    for en, th, spec in BENCH_ROWS:
        v = counts.get(spec)
        if v is None:
            continue
        rows.append(f'        <div class="brow"><span class="lbl"><b>{en}</b>'
                    f'<span lang="th">{th}</span></span>'
                    f'<span class="flap" data-flap="{v}"></span></div>')
    head = (f'        <span class="t">The bench · <span lang="th">โต๊ะช่าง</span>'
            f' — the machines\' own numbers</span>\n'
            f'        <span class="d">counted {when} from the files, databases and '
            f'sitemaps named in the index</span>')
    return ("<!-- BENCH:START -->\n      <div class=\"bench-head\">\n" + head +
            "\n      </div>\n      <div class=\"bench-rows\">\n" + "\n".join(rows) +
            "\n      </div>\n<!-- BENCH:END -->")


def splice(page, start, end, block):
    a, b = page.index(start), page.index(end) + len(end)
    return page[:a] + block + page[b:]


def main():
    data = json.load(open(WORK, encoding="utf-8"))
    counts, pages = Counts(), Pages()
    work = build_work(data, counts, pages)
    when = json.load(open(INDEX_COUNTS, encoding="utf-8"))["read"] \
        if os.path.exists(INDEX_COUNTS) else str(date.today())
    bench = build_bench(counts, when, data)

    page = open(PAGE, encoding="utf-8").read()
    page = splice(page, "<!-- WORK:START -->", "<!-- WORK:END -->", work)
    page = splice(page, "<!-- BENCH:START -->", "<!-- BENCH:END -->", bench)
    page = splice(page, "<!-- SHOP:START -->", "<!-- SHOP:END -->",
                  build_shop(data, counts))
    open(PAGE, "w", encoding="utf-8").write(page)
    if os.path.exists(LLMS):
        txt = open(LLMS, encoding="utf-8").read()
        if "<!-- WORK:START -->" in txt:
            txt = splice(txt, "<!-- WORK:START -->", "<!-- WORK:END -->",
                         build_llms(data, counts, pages))
            open(LLMS, "w", encoding="utf-8").write(txt)
        else:
            warnings.append("llms.txt has no WORK markers — portfolio not written there")
    counts.save()

    n = len(data["cards"])
    print(f"{n} cards in {len(data['lanes'])} lanes · {len(counts.fresh)} numbers read")
    for w in warnings:
        print("  !", w)
    return 1 if any("no longer" in w or "missing" in w for w in warnings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
