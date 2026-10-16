#!/usr/bin/env python3
"""Build the task board's graph and seed from data/tasks/.

    python3 tools/build_tasks.py            # write the files below
    python3 tools/build_tasks.py --seed     # also load seed.sql into D1 (remote)
    python3 tools/build_tasks.py --new      # categories posters named that the graph lacks

Writes:
  functions/api/_taskgraph.js   the graph the board's functions read
  docs/tasks/graph.json         nodes and typed edges, for anyone
  docs/tasks/graph/index.html   the graph, drawn
  data/tasks/seed.sql           our postings and the asks from elsewhere, by key

A new kind of work is one line in data/tasks/graph.json; this checks it.
"""
import html
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "tasks"
DOCS = ROOT / "docs" / "tasks"
FN = ROOT / "functions" / "api" / "_taskgraph.js"
DB = "hongdam-tasks"
SEED_DAY = "2026-10-16T00:00:00.000Z"
BY = {"robot", "human", "both"}


def load():
    g = json.loads((DATA / "graph.json").read_text())
    ids = [n["id"] for n in g["nodes"]]
    assert len(ids) == len(set(ids)), "duplicate node id"
    known = set(ids)
    for n in g["nodes"]:
        assert n.get("up") is None or n["up"] in known, f"{n['id']}: no group {n.get('up')}"
        assert n["by"] in BY, n
        assert n.get("en") and n.get("th"), n
        for o in n["who"]:
            assert o in g["orgs"], f"{n['id']}: no org {o}"
        for r in n.get("rel", []):
            assert r in known, f"{n['id']}: related to unknown {r}"
        p = n.get("price")
        if n.get("up"):
            assert p and len(p) == 1 and next(iter(p)) in {"baht", "her", "quote", "free", "trade"}, n
            if "baht" in p:
                assert p["baht"] in g["ladder"], f"{n['id']}: ฿{p['baht']} is not a rung"
    return g


def edges(g):
    out = []
    for n in g["nodes"]:
        if n.get("up"):
            out.append({"s": n["id"], "t": n["up"], "type": "part_of"})
        for o in n["who"]:
            out.append({"s": n["id"], "t": o, "type": "answered_by"})
        out.append({"s": n["id"], "t": n["by"], "type": "done_by"})
        for r in n.get("rel", []):
            out.append({"s": n["id"], "t": r, "type": "related"})
    return out


def write_js(g):
    slim = {"orgs": g["orgs"], "ladder": g["ladder"], "nodes": g["nodes"]}
    FN.write_text("// Written by tools/build_tasks.py from data/tasks/graph.json. Edit the JSON.\n"
                  f"export const GRAPH = {json.dumps(slim, ensure_ascii=False)}\n")


def write_json(g):
    DOCS.mkdir(parents=True, exist_ok=True)
    nodes = [{"id": k, "type": "org", "en": v["en"], "th": v["th"], "href": v["href"]} for k, v in g["orgs"].items()]
    nodes += [{"id": k, "type": "worker", "en": k} for k in sorted(BY)]
    for n in g["nodes"]:
        nodes.append({"id": n["id"], "type": "category" if n.get("up") else "group", "en": n["en"], "th": n["th"],
                      "price": n.get("price"), "href": n.get("href"),
                      "page": f"https://hongdam.net/tasks/c/{n['id']}"})
    doc = {"name": "Hongdam task graph", "ladder_baht": g["ladder"],
           "grows": "POST https://hongdam.net/api/tasks with a category the graph lacks; new names are listed at /api/tasks/new",
           "nodes": nodes, "edges": edges(g)}
    (DOCS / "graph.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1))


# ── the drawing ─────────────────────────────────────────────────────────────
COL = {"robot": "#7fc8a0", "human": "#ff6a45", "both": "#e7be6a"}


def svg(g):
    e = html.escape
    roots = [n for n in g["nodes"] if not n.get("up")]
    kids = {r["id"]: [n for n in g["nodes"] if n.get("up") == r["id"]] for r in roots}
    total = sum(len(v) + 2 for v in kids.values())
    W, C, R1, R2 = 1800, 900, 470, 720
    pos, parts, a = {}, [], -math.pi / 2
    for r in roots:
        span = 2 * math.pi * (len(kids[r["id"]]) + 2) / total
        mid = a + span / 2
        pos[r["id"]] = (C + R1 * math.cos(mid), C + R1 * math.sin(mid), mid)
        ks = kids[r["id"]]
        for i, k in enumerate(ks):
            t = a + span * (i + 1.5) / (len(ks) + 2)
            pos[k["id"]] = (C + R2 * math.cos(t), C + R2 * math.sin(t), t)
        a += span
    for n in g["nodes"]:
        for rel in n.get("rel", []):
            (x1, y1, _), (x2, y2, _) = pos[n["id"]], pos[rel]
            parts.append(f'<path class="rel" d="M{x1:.0f},{y1:.0f} Q{C},{C} {x2:.0f},{y2:.0f}"/>')
    for r in roots:
        x, y, _ = pos[r["id"]]
        parts.append(f'<line class="up" x1="{C}" y1="{C}" x2="{x:.0f}" y2="{y:.0f}"/>')
        for k in kids[r["id"]]:
            kx, ky, _ = pos[k["id"]]
            parts.append(f'<line class="up" x1="{x:.0f}" y1="{y:.0f}" x2="{kx:.0f}" y2="{ky:.0f}"/>')
    for n in g["nodes"]:
        x, y, t = pos[n["id"]]
        href = f"/tasks/c/{n['id']}"
        if n.get("up"):
            deg = math.degrees(t)
            flip = 90 < (deg % 360) < 270
            rot = deg + 180 if flip else deg
            anchor = "end" if flip else "start"
            dx = -12 if flip else 12
            parts.append(f'<a href="{href}"><circle cx="{x:.0f}" cy="{y:.0f}" r="7" fill="{COL[n["by"]]}"/>'
                         f'<text class="leaf" transform="translate({x:.0f},{y:.0f}) rotate({rot:.1f})" x="{dx}" dy="5" '
                         f'text-anchor="{anchor}">{e(n["en"])}</text><title>{e(n["th"])}</title></a>')
        else:
            deg = math.degrees(t)
            flip = 90 < (deg % 360) < 270
            rot = deg + 180 if flip else deg
            parts.append(f'<a href="{href}"><circle class="root" cx="{x:.0f}" cy="{y:.0f}" r="14" fill="{COL[n["by"]]}"/>'
                         f'<text class="root" transform="translate({x:.0f},{y:.0f}) rotate({rot:.1f})" x="{18 if flip else -18}" dy="7" '
                         f'text-anchor="{"start" if flip else "end"}">{e(n["en"])}</text><title>{e(n["th"])}</title></a>')
    parts.append(f'<circle cx="{C}" cy="{C}" r="44" fill="#211710" stroke="#e7be6a"/>'
                 f'<text class="leaf" x="{C}" y="{C + 6}" text-anchor="middle">งาน · Tasks</text>')
    js_pos = {k: [round(v[0]), round(v[1]), round(v[2], 3)] for k, v in pos.items()}
    return (f'<svg id="g" viewBox="-260 -60 {W + 520} {W + 120}" role="img" aria-label="Task graph">'
            + "".join(parts) + '<g id="new"></g></svg>', js_pos)


def write_page(g):
    e = html.escape
    drawing, js_pos = svg(g)
    roots = [n for n in g["nodes"] if not n.get("up")]
    groups = []
    for r in roots:
        ks = [n for n in g["nodes"] if n.get("up") == r["id"]]
        lis = "".join(f'<li><a href="/tasks/c/{k["id"]}">{e(k["en"])}</a> <span lang="th">{e(k["th"])}</span>'
                      f' <i class="by-{k["by"]}">{k["by"]}</i></li>' for k in ks)
        groups.append(f'<section class="grp"><h2><a href="/tasks/c/{r["id"]}">{e(r["en"])}</a> <span lang="th">{e(r["th"])}</span></h2><ul>{lis}</ul></section>')
    n_cat = sum(1 for n in g["nodes"] if n.get("up"))
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Task graph · Hongdam</title>
<meta name="description" content="{len(roots)} groups and {n_cat} kinds of work Mot Dang, Hongdam and Chiang Mai Visa Desk answer, as a graph that grows when posters name new work.">
<meta property="og:title" content="Task graph · กราฟงาน · Hongdam"><meta property="og:description" content="{len(roots)} groups and {n_cat} kinds of work Mot Dang, Hongdam and Chiang Mai Visa Desk answer.">
<meta property="og:type" content="website"><meta property="og:image" content="https://hongdam.net/assets/card.jpg"><meta property="og:image:alt" content="Hongdam หงส์ดำ, Chiang Rai">
<meta property="og:url" content="https://hongdam.net/tasks/graph/"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg"><link rel="canonical" href="https://hongdam.net/tasks/graph/">
<link rel="alternate" type="application/json" href="/tasks/graph.json">
<link rel="stylesheet" href="/assets/rt.css">
<style>
 #g{{width:100%;height:auto;background:var(--lacquer-2);border:1px solid var(--line);border-radius:12px;touch-action:pinch-zoom}}
 #g line.up{{stroke:rgba(231,190,106,.28);stroke-width:1.5}}
 #g path.rel{{fill:none;stroke:rgba(127,200,160,.35);stroke-width:1.5;stroke-dasharray:6 6}}
 #g text.leaf{{fill:#cdbfa4;font-size:17px}} #g text.root{{fill:#e7be6a;font-size:21px;font-weight:700}}
 #g text.rootth{{fill:#c89a45;font-size:20px}} #g a:hover text{{fill:#f2e7d3}}
 #g .new circle{{fill:none;stroke:#f2e7d3;stroke-dasharray:4 3;stroke-width:2}} #g .new text{{fill:#f2e7d3;font-size:17px;font-style:italic}}
 .key{{display:flex;gap:18px;flex-wrap:wrap;font-size:15px;color:var(--cream-dim);margin:12px 0 28px}}
 .key b{{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px}}
 .grps{{columns:280px;column-gap:28px}} .grp{{break-inside:avoid;margin-bottom:26px}}
 .grp h2{{font-size:20px;margin-bottom:6px}} .grp ul{{list-style:none}} .grp li{{font-size:15px;padding:3px 0;border-top:1px solid var(--line)}}
 .grp li span{{color:var(--cream-dim)}} .grp i{{font-style:normal;font-size:12px;letter-spacing:.08em;margin-left:4px}}
 .by-robot{{color:#7fc8a0}} .by-human{{color:#ff6a45}} .by-both{{color:#e7be6a}}
 .acts{{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}}
 #newlist{{color:var(--cream-dim);font-size:15px;margin:-10px 0 24px}}
 footer{{max-width:980px;margin:0 auto;padding:24px 16px 48px;color:var(--cream-dim);font-size:15px}}
</style></head><body>
<header class="top"><a class="mark" href="/">HONGDAM <span lang="th">หงส์ดำ</span></a>
<nav><a href="/tasks">Tasks</a><a href="/translation/">Translation</a><a href="/own">Own</a><a href="/market">Market</a></nav></header>
<main>
<h1>Task graph <span>กราฟงาน</span></h1>
<p class="lede">{len(roots)} groups, {n_cat} kinds of work. A dot opens its tasks.<br><span lang="th">{len(roots)} กลุ่ม {n_cat} ประเภทงาน แตะจุดเพื่อดูงาน</span></p>
<div class="acts"><a class="btn" href="/tasks#post">Post a task · ลงงาน</a><a class="btn" href="/tasks#ours">Take a task · รับงาน</a></div>
{drawing}
<div class="key"><span><b style="background:#7fc8a0"></b>robot · บอท</span><span><b style="background:#ff6a45"></b>human · คน</span><span><b style="background:#e7be6a"></b>both · ทั้งสอง</span><span>- - related · เกี่ยวข้อง</span><span>◌ named by a poster · ผู้ลงงานตั้งชื่อ</span></div>
<p id="newlist"></p>
<div class="grps">{''.join(groups)}</div>
</main>
<footer><a href="/tasks/graph.json">graph.json</a> · nodes and typed edges (part_of, answered_by, done_by, related) · <span lang="th">หงส์ดำ</span> Hongdam · Chiang Rai</footer>
<script>
(function () {{
  var P = {json.dumps(js_pos)}, NS = 'http://www.w3.org/2000/svg';
  fetch('/api/tasks/new').then(function (r) {{ return r.json() }}).then(function (d) {{
    var g = document.getElementById('new'), seen = {{}}, names = [];
    (d.new || []).forEach(function (n, i) {{
      var p = P[n.up] || [900, 900, 0], k = (seen[n.up] = (seen[n.up] || 0) + 1);
      var t = p[2] + 0.06 * k, x = 900 + 820 * Math.cos(t), y = 900 + 820 * Math.sin(t);
      var a = document.createElementNS(NS, 'a'); a.setAttribute('href', '/tasks/' + n.task); a.setAttribute('class', 'new');
      a.innerHTML = '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + x + '" y2="' + y + '" stroke="#f2e7d3" stroke-dasharray="4 4"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="7"/>';
      var tx = document.createElementNS(NS, 'text'); tx.setAttribute('x', x + 12); tx.setAttribute('y', y + 5); tx.textContent = n.name;
      a.appendChild(tx); g.appendChild(a); names.push(n.name);
    }});
    if (names.length) document.getElementById('newlist').textContent = 'Named by posters · ผู้ลงงานตั้งชื่อ: ' + names.join(' · ');
  }}).catch(function () {{}});
}})();
</script>
</body></html>
"""
    (DOCS / "graph").mkdir(parents=True, exist_ok=True)
    (DOCS / "graph" / "index.html").write_text(page)


# ── the seed ────────────────────────────────────────────────────────────────
def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def write_seed(g):
    s = json.loads((DATA / "seed.json").read_text())
    cats = {n["id"]: n for n in g["nodes"]}
    names = {k: v["en"] for k, v in g["orgs"].items()}
    rows = []
    cols = ("key,src,org,poster,cat,by,title,title_th,what,what_th,place,href,site,price_kind,baht,"
            "price_note,unit,slots,state,created_at,shoup_at,ends_at")
    for o in s["ours"]:
        assert o["cat"] in cats, o["key"]
        mirror = o.get("mirror")
        assert mirror or o["baht"] in g["ladder"], f"{o['key']}: ฿{o['baht']} is not a rung"
        by = {"both": "either"}.get(o["by"], o["by"])
        note = json.dumps({"en": mirror, "th": o.get("mirror_th")}, ensure_ascii=False) if mirror else None
        rows.append((o["key"], "ours", o["org"], names[o["org"]], o["cat"], by, o["en"], o["th"], o["what_en"],
                     o["what_th"], o.get("where"), o.get("href"), None, "mirror" if mirror else "shoup",
                     o["baht"], note, o.get("unit"), o.get("slots", 3), "open", SEED_DAY, SEED_DAY,
                     (o["ends"] + "T23:59:59.000Z") if o.get("ends") else None))
    for o in s["elsewhere"]:
        assert o["cat"] in cats, o["key"]
        by = {"both": "either"}.get(o["by"], o["by"])
        rows.append((o["key"], "elsewhere", None, o["site"], o["cat"], by, o["en"], None, None, None, None,
                     o["href"], o["site"], "none", None, None, None, 3, "open", SEED_DAY, None, None))
    sql = ["-- Written by tools/build_tasks.py from data/tasks/seed.json."]
    for r in rows:
        sql.append(f"INSERT OR IGNORE INTO task ({cols}) VALUES ({','.join(q(v) for v in r)});")
    for o in s["elsewhere"]:
        c = cats[o["cat"]]
        baht = c["price"].get("baht")
        for org in c["who"]:
            sql.append("INSERT INTO answer (task_id, org, kind, name, baht, created_at) "
                       f"SELECT id, {q(org)}, 'offer', {q(names[org])}, {q(baht)}, {q(SEED_DAY)} FROM task "
                       f"WHERE key = {q(o['key'])} AND NOT EXISTS (SELECT 1 FROM answer a WHERE a.task_id = task.id AND a.org = {q(org)});")
    (DATA / "seed.sql").write_text("\n".join(sql) + "\n")
    return len(rows)


def main():
    g = load()
    write_js(g)
    write_json(g)
    write_page(g)
    n = write_seed(g)
    cats = sum(1 for x in g["nodes"] if x.get("up"))
    print(f"graph: {len(g['nodes']) - cats} groups, {cats} categories, {len(edges(g))} edges · seed: {n} tasks")
    if "--seed" in sys.argv:
        subprocess.run(["npx", "wrangler@3", "d1", "execute", DB, "--remote", "--file", str(DATA / "seed.sql")], check=True)
    if "--new" in sys.argv:
        import urllib.request
        print(urllib.request.urlopen("https://hongdam.net/api/tasks/new").read().decode())


if __name__ == "__main__":
    main()
