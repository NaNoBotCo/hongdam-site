#!/usr/bin/env python3
"""
Round translation stamp for hongdam.net.

Everything is emitted as vector paths — text is shaped with HarfBuzz and outlined
with fontTools, so the SVG renders identically with no font installed and no
<textPath> support required.

QR -> https://hongdam.net/services
"""
import io, math, os, sys
import segno, uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

# ---------------------------------------------------------------- content ---
URL   = "https://hongdam.net/services"
TOP   = "บริการแปลภาษามืออาชีพ"        # professional translation services
BOT   = "หงส์ดำ · HONGDAM.NET"
INNER = [("BUSINESS SERVICES", 146.0)]
ROWS  = [("วันที่", 410.0),           # date
         ("ชื่อผู้แปล", 450.0)]        # translator's name

FONT_SRC = ("/Users/annikapeacock/Developer/claude code projects/"
            "coucal-clock/data/fonts/NotoSansThai-Variable.ttf")   # OFL; Latin + Thai

# ---------------------------------------------------------------- geometry --
CX = CY = 300.0
R_HEAVY = 290.0    # heavy outer rule
R_OTHIN = 280.0    # thin rule — outer edge of the text band
R_ITHIN = 230.0    # thin rule — inner edge of the text band
BAND_PAD = 6.0     # clearance from each thin rule to the nearest ink
SZ_TOP, TRK_TOP = 30.0, 0.8        # requested; auto-reduced if the run will not fit
SZ_BOT, TRK_BOT = 28.0, 2.4
SPAN_TOP, SPAN_BOT = 112.0, 104.0  # degrees each arc should occupy; tracking is solved to suit
SZ_LABEL, TRK_LABEL = 19.0, 0.8
SZ_INNER, TRK_INNER = 22.0, 2.4
CODE      = 208.0                  # QR code area (surrounding white is the quiet zone)
CODE_CY   = 276.0
RULE_LEFT_PAD = 14.0               # gap between a label and its rule
RULE_RIGHT    = 452.0              # right end of both rules
LABEL_LEFT    = 148.0              # left edge of both labels

# ------------------------------------------------------------------ fonts ---
def load(weight=700, width=100.0):
    f = instancer.instantiateVariableFont(
        TTFont(FONT_SRC), {"wght": weight, "wdth": width}, inplace=False)
    buf = io.BytesIO(); f.save(buf)
    hbf = hb.Font(hb.Face(buf.getvalue()))
    upem = f["head"].unitsPerEm
    hbf.scale = (upem, upem)
    return f, hbf, upem

def shape(hbf, text):
    b = hb.Buffer(); b.add_str(text); b.guess_segment_properties()
    hb.shape(hbf, b, {"kern": True, "liga": True, "ccmp": True, "mark": True, "mkmk": True})
    return list(zip(b.glyph_infos, b.glyph_positions))

def glyph_d(ttf, gid):
    gs = ttf.getGlyphSet()
    pen = SVGPathPen(gs)
    gs[ttf.getGlyphOrder()[gid]].draw(pen)
    return pen.getCommands()

def run_extent(ttf, hbf, text, size, tracking, upem):
    """Radial extent of a shaped run, in drawing units, measured from real outlines."""
    runs, _, k = layout(hbf, text, size, tracking, upem)
    gs = ttf.getGlyphSet(); order = ttf.getGlyphOrder()
    lo, hi = None, None
    for gid, _gx, gy in runs:
        bp = BoundsPen(gs); gs[order[gid]].draw(bp)
        if bp.bounds is None:
            continue
        y0, y1 = bp.bounds[1] * k + gy, bp.bounds[3] * k + gy
        lo = y0 if lo is None else min(lo, y0)
        hi = y1 if hi is None else max(hi, y1)
    return (lo or 0.0), (hi or 0.0)

def fit_arc(ttf, hbf, upem, text, size, tracking, top):
    """Shrink `size` until the run fits the ring band, then centre it radially."""
    inner, outer = R_ITHIN + BAND_PAD, R_OTHIN - BAND_PAD
    avail = outer - inner
    for _ in range(12):
        lo, hi = run_extent(ttf, hbf, text, size, tracking, upem)
        h = hi - lo
        if h <= avail:
            break
        size *= avail / h * 0.995
        tracking *= avail / h
    slack = (avail - h) / 2.0
    radius = (inner + slack - lo) if top else (inner + slack + hi)
    return size, tracking, radius, h

def track_to_span(hbf, upem, text, size, radius, span_deg):
    """Letter-spacing that makes the run occupy `span_deg` of arc. Marks keep zero advance."""
    _, w0, _ = layout(hbf, text, size, 0.0, upem)
    gaps = sum(1 for _i, p in shape(hbf, text) if p.x_advance) - 1
    if gaps < 1:
        return 0.0
    return max((math.radians(span_deg) * radius - w0) / gaps, 0.0)

def layout(hbf, text, size, tracking, upem):
    """Flat pen positions, in drawing units, plus the run's total width."""
    k = size / upem
    out, x = [], 0.0
    for info, pos in shape(hbf, text):
        out.append((info.codepoint, x + pos.x_offset * k, pos.y_offset * k))
        x += pos.x_advance * k + (tracking if pos.x_advance else 0)
    return out, (x - tracking if out else 0.0), k

# --------------------------------------------------- text bent onto an arc --
def arc_text(ttf, hbf, upem, text, radius, size, tracking, top):
    runs, total, k = layout(hbf, text, size, tracking, upem)
    ds = []
    for gid, gx, gy in runs:
        d = glyph_d(ttf, gid)
        if not d.strip():
            continue
        t = gx - total / 2.0
        th = (math.pi / 2) - t / radius if top else (-math.pi / 2) + t / radius
        c, s = math.cos(th), math.sin(th)
        T, U = ((s, c), (c, -s)) if top else ((-s, -c), (-c, s))
        px, py = CX + radius * c, CY - radius * s
        ds.append(
            f'<path transform="matrix({k*T[0]:.6f},{k*T[1]:.6f},{k*U[0]:.6f},'
            f'{k*U[1]:.6f},{px + gy*U[0]:.3f},{py + gy*U[1]:.3f})" d="{d}"/>')
    return ds, total

# ---------------------------------------------------------- flat text runs --
def flat_text(ttf, hbf, upem, text, size, tracking, y, x=None, centre=True):
    runs, total, k = layout(hbf, text, size, tracking, upem)
    x0 = (CX - total / 2.0) if centre else x
    ds = []
    for gid, gx, gy in runs:
        d = glyph_d(ttf, gid)
        if d.strip():
            ds.append(f'<path transform="matrix({k:.6f},0,0,{-k:.6f},'
                      f'{x0+gx:.3f},{y-gy:.3f})" d="{d}"/>')
    return ds, total, x0

# -------------------------------------------------------------------- misc --
def pt(r, deg):
    a = math.radians(deg)
    return CX + r * math.cos(a), CY - r * math.sin(a)

def diamond(deg, r=252.0, s=8.0):
    x, y = pt(r, deg)
    return (f'<path d="M {x:.2f} {y-s:.2f} L {x+s:.2f} {y:.2f} '
            f'L {x:.2f} {y+s:.2f} L {x-s:.2f} {y:.2f} Z"/>')

def qr_rects():
    q = segno.make(URL, error="q")
    m = [[bool(v) for v in row] for row in q.matrix]
    n = len(m); mod = CODE / n
    ox, oy = CX - CODE / 2, CODE_CY - CODE / 2
    out = []
    for r, row in enumerate(m):
        c = 0
        while c < n:
            if row[c]:
                s0 = c
                while c < n and row[c]:
                    c += 1
                out.append(f'<rect x="{ox+s0*mod:.3f}" y="{oy+r*mod:.3f}" '
                           f'width="{(c-s0)*mod:.3f}" height="{mod:.3f}"/>')
            else:
                c += 1
    return out, q, n, mod

def clear_halfwidth(y):
    """Half-width of the disc interior at a given y — the fit budget for a row."""
    dy = abs(y - CY)
    return math.sqrt(max(R_ITHIN**2 - dy**2, 0.0))

# ------------------------------------------------------------------ render --
def build(ink="#000000", mm=60):
    ttf, hbf, upem = load()
    sz_t, trk_t, r_top, h_t = fit_arc(ttf, hbf, upem, TOP, SZ_TOP, TRK_TOP, True)
    sz_b, trk_b, r_bot, h_b = fit_arc(ttf, hbf, upem, BOT, SZ_BOT, TRK_BOT, False)
    trk_t = track_to_span(hbf, upem, TOP, sz_t, r_top, SPAN_TOP)
    trk_b = track_to_span(hbf, upem, BOT, sz_b, r_bot, SPAN_BOT)
    top_ds, top_w = arc_text(ttf, hbf, upem, TOP, r_top, sz_t, trk_t, True)
    bot_ds, bot_w = arc_text(ttf, hbf, upem, BOT, r_bot, sz_b, trk_b, False)
    qrs, q, n, mod = qr_rects()

    inner, checks = [], []
    for text, y in INNER:
        ds, w, _ = flat_text(ttf, hbf, upem, text, SZ_INNER, TRK_INNER, y)
        inner += ds
        checks.append((text, y, w / 2, clear_halfwidth(y)))

    rows = []
    for label, y in ROWS:
        ds, w, x0 = flat_text(ttf, hbf, upem, label, SZ_LABEL, TRK_LABEL,
                              y, x=LABEL_LEFT, centre=False)
        rows += ds
        rows.append(f'<rect x="{x0+w+RULE_LEFT_PAD:.2f}" y="{y+4:.2f}" '
                    f'width="{RULE_RIGHT-(x0+w+RULE_LEFT_PAD):.2f}" height="2.5"/>')
        checks.append((label, y, (RULE_RIGHT - LABEL_LEFT) / 2, clear_halfwidth(y + 4)))

    top_span = math.degrees(top_w / r_top)
    bot_span = math.degrees(bot_w / r_bot)
    d_left  = ((90 + top_span / 2) + (270 - bot_span / 2)) / 2
    d_right = (((90 - top_span / 2) + 360) + (270 + bot_span / 2)) / 2 % 360

    nl = chr(10)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"
     width="{mm}mm" height="{mm}mm" role="img"
     aria-label="HONGDAM — บริการแปลภาษามืออาชีพ, business services. The QR code links to {URL}">
  <title>HONGDAM — business services</title>
  <desc>{TOP} · BUSINESS SERVICES · {BOT}. QR code resolves to {URL}</desc>
  <g fill="{ink}">
    <circle cx="300" cy="300" r="{R_HEAVY}" fill="none" stroke="{ink}" stroke-width="9"/>
    <circle cx="300" cy="300" r="{R_OTHIN}" fill="none" stroke="{ink}" stroke-width="2.5"/>
    <circle cx="300" cy="300" r="{R_ITHIN}" fill="none" stroke="{ink}" stroke-width="2.5"/>

    <!-- ring: Thai over the top -->
    <g>
      {nl.join("      " + p for p in top_ds).strip()}
    </g>
    <!-- ring: identity under the bottom -->
    <g>
      {nl.join("      " + p for p in bot_ds).strip()}
    </g>

    {diamond(d_left)}
    {diamond(d_right)}

    <!-- service line -->
    <g>
      {nl.join("      " + p for p in inner).strip()}
    </g>

    <!-- QR -> {URL} -->
    <g shape-rendering="crispEdges">
      {nl.join("      " + r for r in qrs).strip()}
    </g>

    <!-- fill-in rows -->
    <g>
      {nl.join("      " + p for p in rows).strip()}
    </g>
  </g>
</svg>
'''
    return svg, dict(q=q, n=n, mod=mod, top_span=top_span, bot_span=bot_span,
                     checks=checks, fit=[(sz_t, r_top, h_t), (sz_b, r_bot, h_b)])

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for name, ink in (("black", "#000000"), ("red", "#C8371E")):
        svg, info = build(ink)
        p = os.path.join(out, f"hongdam-translation-stamp-{name}.svg")
        open(p, "w").write(svg)
        print(p, f"{os.path.getsize(p)/1024:.1f} KB")
    i = info
    gap = 360 - i["top_span"] - i["bot_span"]
    print(f'QR   : v{i["q"].version}, {i["n"]}x{i["n"]}, ECC Q, '
          f'module {i["mod"]/600*60:.2f} mm at a 60 mm stamp')
    print(f'ring : top {i["top_span"]:.1f}deg + bottom {i["bot_span"]:.1f}deg, '
          f'{gap/2:.1f}deg per gap  (band {R_OTHIN-R_ITHIN:.0f}u)')
    for tag, (sz, r, h) in zip(("top", "bottom"), i["fit"]):
        print(f'fit  : {tag:<7} size {sz:.1f}u, baseline r={r:.1f}, ink height {h:.1f}u')
    for label, y, half, budget in i["checks"]:
        print(f'fit  : {label:<25} y={y:.0f}  half-width {half:.0f}u / {budget:.0f}u '
              f'{"OK" if half <= budget else "OVERFLOW"}')
