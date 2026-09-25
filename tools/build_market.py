#!/usr/bin/env python3
"""Build the red-team pack market from data/packs/*.json.

Writes:
  functions/api/_packs.js   the probes the /api/redteam function runs
  docs/market/packs.json    every pack, for the runner and for download
  docs/market/<id>.json     one pack
  docs/market/index.html    the market page

Counts on the page are computed here, from the pack files.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKS = ROOT / "data" / "packs"
OUT = ROOT / "docs" / "market"
FN = ROOT / "functions" / "api" / "_packs.js"

ORDER = ["extraction", "override", "indirect", "thai", "encoding", "scope"]
CHECK = {"leak": "leak", "marker": "marker", "scope": "judge"}


def load():
    packs = [json.loads(p.read_text()) for p in PACKS.glob("*.json")]
    for p in packs:
        ids = [q["id"] for q in p["probes"]]
        assert len(ids) == len(set(ids)), f"duplicate probe id in {p['id']}"
        for q in p["probes"]:
            assert q["check"] in CHECK, q
            assert q["check"] != "marker" or q.get("marker"), q
    rank = {k: i for i, k in enumerate(ORDER)}
    return sorted(packs, key=lambda p: (rank.get(p["id"], 99), p["name"]))


def price(p):
    return "Free" if not p.get("price_usd") else f"${p['price_usd']:,}"


def mix(p):
    n = {}
    for q in p["probes"]:
        k = CHECK[q["check"]]
        n[k] = n.get(k, 0) + 1
    return " · ".join(f"{v} {k}" for k, v in n.items())


def row(p):
    e = html.escape
    return f"""
    <article class="pack">
      <h2>{e(p['name'])} <span lang="th">{e(p.get('name_th', ''))}</span></h2>
      <p>{e(p['summary'])}</p>
      <dl>
        <div><dt>Probes</dt><dd>{len(p['probes'])}</dd></div>
        <div><dt>Checks</dt><dd>{e(mix(p))}</dd></div>
        <div><dt>By</dt><dd><a href="{e(p['author_url'])}">{e(p['author'])}</a></dd></div>
        <div><dt>Licence</dt><dd>{e(p['licence'])}</dd></div>
        <div><dt>Price</dt><dd>{price(p)}</dd></div>
      </dl>
      <p class="acts"><a class="btn" href="/redteam?pack={e(p['id'])}">Run</a>
        <a href="/market/{e(p['id'])}.json" download>JSON</a></p>
    </article>"""


def page(packs):
    total = sum(len(p["probes"]) for p in packs)
    tmpl = (ROOT / "tools" / "market.tmpl.html").read_text()
    return (tmpl.replace("{{PACKS}}", "".join(row(p) for p in packs))
                .replace("{{NPACKS}}", str(len(packs)))
                .replace("{{NPROBES}}", str(total)))


def main():
    packs = load()
    OUT.mkdir(parents=True, exist_ok=True)
    for p in packs:
        (OUT / f"{p['id']}.json").write_text(json.dumps(p, ensure_ascii=False, indent=2) + "\n")
    (OUT / "packs.json").write_text(json.dumps(packs, ensure_ascii=False, indent=2) + "\n")
    server = {p["id"]: {"probes": p["probes"]} for p in packs}
    FN.write_text("// Built by tools/build_market.py from data/packs/. Do not edit.\n"
                  f"export const PACKS = {json.dumps(server, ensure_ascii=False)};\n")
    (OUT / "index.html").write_text(page(packs))
    print(f"{len(packs)} packs, {sum(len(p['probes']) for p in packs)} probes")


if __name__ == "__main__":
    main()
