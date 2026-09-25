# Hongdam — hongdam.net

Web dev studio site for Hongdam, Chiang Rai. Single static page, no build step —
`docs/index.html` is the whole site, GitHub-Pages-ready (`.nojekyll` + `CNAME` included).

## Status: draft, not published

Built per Nan's instructions on 2026-07-30. Content is drafted from Nan's own live
projects, framed as a **partnership** rather than sole ownership, since the IP
transfer to Hongdam isn't final yet. Update the "How we work" section once that
changes.

## What's in this build (v2, expanded per Nan's request)

- **Real screenshots, not mockups.** 12 pages were captured live with headless
  Chrome (`docs/assets/screens/`) — motdang.net, wichaa.net, poplucky.net,
  defiant.to, hakfarang.net, nanobotco.github.io/offramp, nanobotco.github.io,
  nanobotco.github.io/skipdjt, and three wichaa.net instrument pages (jovilabe,
  divination, moon — moon/redspot kept as parallax background art only, not
  listed as separate repos since they're pages inside the Lanna repo, not repos
  of their own). Each sits in a fake browser-chrome frame (dots + URL bar) so
  it reads as a genuine screenshot, not a photo.
- **All 38 public NaNoBotCo repos are represented** — verified live via
  `gh repo list` on 2026-07-30, cross-checked against the `project_git_repos`
  memory for which ones are deliberately private. The 8–10 with a real live
  URL got full screenshot treatment; the other ~28 (APIs, CLIs, crawlers, a
  text game, SMAPI mod, etc. — genuinely no "sight" to screenshot) got a
  designed icon-tile grid instead, grouped by category, each linking straight
  to its GitHub repo. Nothing fake-screenshotted.
- **Excluded on purpose:** `spec-hud`, `coucal-clock`, `catalog-pipeline`,
  `acr-hud`, `manuscript-crawler` (all private on GitHub already), plus
  anything never pushed at all — `khwan`, `tel`, `michael-go-court`/legal
  material, `photo-mine`, `rusty-chandelier` (client-owned). None of these
  appear anywhere on the page.
- **Hero graphics** are wichaa.net's own share-card art (`docs/assets/graphics/`
  — moon complication, red spot dial, jovilabe, atlas), used as a parallax
  background layer (JS `translateY` on scroll, `prefers-reduced-motion`
  respected) plus a drifting animated-gradient backdrop.
- **On the photo roll:** I didn't browse it. `photo-mine`'s own `BOTS.md` /
  `RABBIT_HOLES.md` document real passport, bank-card, financial, and medical
  hits mixed into that library — not something to page through for a business
  site's hero art. If there are specific photos you want used, export them
  (or point me to a folder) and I'll drop them in; otherwise wichaa.net's
  existing graphics are covering the "visual" ask safely.

## v3 — scroll-driven vertical animations (2026-07-30)

- **Top progress bar** fills across the viewport width as you scroll the page.
- **Continuous parallax inside each screenshot frame** — the captured page drifts
  slightly within its browser-chrome window as it passes through view (not just
  an entrance effect; keeps moving the whole time the card is on screen).
- **Staggered reveal** — cards/tiles fade + rise in with a slight cascade by
  column position, instead of all popping in at once.
- **Slow-rotating clock glyph** in the "offices overlooking the clocktower" card.
- All of it is one rAF-throttled scroll listener; geometry is measured once on
  load/resize, never inside the scroll handler itself (an earlier draft read
  `getBoundingClientRect()` per element on every scroll frame — real layout-
  thrashing risk, fixed before shipping).
- Tried native CSS `animation-timeline: view()/scroll()` first (the actual
  "scroll-driven animations" browser API) — pulled it back in favor of the
  plain JS version since it's more broadly predictable across engines, and the
  JS version already reuses a scroll-handler pattern proven earlier in this
  build. Visually the outcome is the same.
- The `.reveal` hidden state (`opacity:0`) is now gated behind an
  `html.reveal-ready` class JS adds right before wiring up the
  IntersectionObserver, plus a 1.5s force-reveal safety net — so content can
  never get stuck invisible if JS is slow, errors, or a browser lands straight
  on a scrolled anchor before the observer's first callback fires.

## v4 — lucky for Thai people and robots alike (2026-07-30)

**For people:**
- Bilingual title/description (`<title>` and meta description now carry Thai too).
- Favicon (`docs/assets/favicon.svg`) matching the nav mark.
- A permanent thin gold "gilt-edge" hairline across the very top of the page —
  a premium-print touch, not just the scroll-progress fill.
- A subtle grain-texture overlay (`feTurbulence` data-URI, `mix-blend-mode:overlay`,
  ~3.5% opacity) for a tactile, less flat-vector feel.
- Ornamental section dividers using ๛ (khomut) — the traditional Thai manuscript
  end-of-section mark. Chosen deliberately over generic decoration: it's real
  Thai typographic heritage, and it ties back to the Lanna-manuscript roots this
  whole body of work actually grew from.
- Footer closes with "ขอให้กิจการเจริญรุ่งเรือง" (a genuine, common Thai
  business-opening blessing — "may the business prosper") next to a small gold
  ๙ seal — เก้า/nine being a well-known auspicious number in Thai culture.
- Card/button hover states warmed from teal to gold, richer layered shadows.

**For robots:**
- JSON-LD structured data (`ProfessionalService` + an `ItemList` of the live
  portfolio) — both validated as parseable JSON.
- Full Open Graph / Twitter Card meta, canonical URL.
- `docs/robots.txt` explicitly welcomes named AI crawlers (GPTBot, ClaudeBot,
  anthropic-ai, Google-Extended, CCBot, PerplexityBot) — same stance Mot Dang
  and wichaa.net already take: crawlers are guests, not pests.
- `docs/llms.txt` — a short plain-language summary of what Hongdam is and does,
  for AI systems that read that convention.
- Footer explicitly links `/llms.txt` so human visitors can see the site means it.

## Still needed before this can go live

1. **Contact info** — email / LINE / phone. The contact section currently shows a
   visible "coming soon" placeholder instead of fake details.
2. **Friend's name** — for the "Built in partnership" credit line, currently generic.
3. **Confirm company name/spelling** — using "Hongdam" (EN) / ฮ่องดำ (rough Thai)
   as placeholders; correct if there's an official Thai name or logo.
4. **Repo + hosting** — per Nan's call, this will live under NaNoBotCo on GitHub for
   now (transfer to Hongdam's own account later). Needs:
   - `git init`, push to a new `NaNoBotCo/hongdam-site` (or similar) repo
   - GitHub Pages enabled on `docs/`, custom domain `hongdam.net` set in repo settings
   - a CNAME record (or A/ALIAS records per GitHub Pages docs) added at whichever
     registrar holds hongdam.net, pointing at NaNoBotCo's GitHub Pages
5. Once live, run the Mot Dang ad entry (already drafted, see below) through
   `build.py` and push, so the sponsor card goes live on motdang.net.

## Mot Dang ad entry (drafted, not yet built/pushed)

Added to `mot-dang/data/ads.json` locally:

```json
{
  "id": "hongdam",
  "th": "Hongdam — บริษัทเว็บดีไซน์เชียงราย เว็บสองภาษา แอปไลน์ ระบบข้อมูลจริง",
  "en": "Hongdam — Chiang Rai web studio: bilingual platforms, LINE-native apps, real data",
  "url": "https://hongdam.net"
}
```

This won't appear on the live site until `mot-dang`'s `build.py` is re-run and the
result is pushed — hold off until hongdam.net actually resolves, so the ad doesn't
link to a dead domain.

## Red team + market (built 2026-09-23, not deployed)

- `data/packs/*.json` → `python3 tools/build_market.py` → `docs/market/`, `functions/api/_packs.js`.
- `docs/redteam/` calls `functions/api/redteam.js`, which needs the Workers AI binding `AI`
  on the Pages project (optional KV `RT_LIMIT` for a per-address daily cap).
- Local: `.claude/rt-dev.sh` → http://localhost:8791/redteam (AI calls are remote and billed).
