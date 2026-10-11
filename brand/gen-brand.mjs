// tanstack-hide brand kit generator: the single source of truth for the identity.
// Run: node gen-brand.mjs  → writes every SVG mark + design tokens into this dir.
// Rasterize with the sibling Taskfile (`task raster`), or `task all` for both.
//
// Adapted from the satl brand-kit template. That template puts a glyph on a
// rounded square tile; this mark is a self-contained round badge (island
// scene + slash), so BADGE() is the whole mark and the variants swap its ring
// and slash colours instead of a tile.
import { readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = dirname(fileURLToPath(import.meta.url))
const BRAND = JSON.parse(readFileSync(`${OUT}/brand.json`, "utf8"))

// ── Manifest ─────────────────────────────────────────────────────────────────
const M = {
  name: BRAND.name,
  label: "TanStack Hide", // human display name (wordmark, alt text)
  tagline: BRAND.tagline,
  subline: "Global or per site · the panel still opens with its hotkey · open source",
  fonts: {
    display: `'${BRAND.fonts.display}', 'Geist', ui-sans-serif, system-ui, sans-serif`,
    sans: `'${BRAND.fonts.sans}', ui-sans-serif, system-ui, sans-serif`,
    mono: `'${BRAND.fonts.mono}', ui-monospace, SFMono-Regular, Menlo, monospace`,
  },
  // Scene palette (sunset sky, sea, island) — shared by every colour variant.
  scene: {
    sky: ["#2DD4BF", "#FDE68A", "#FB923C"],
    sun: "#FDBA74",
    sea: ["#38BDF8", "#0369A1"],
    foam: "#E0F2FE",
    grass: "#22C55E",
    sand: "#FCD34D",
    trunk: "#92400E",
    leaf: "#16A34A",
  },
  ink: "#0B0B0F", // ring + slash outline on light surfaces
  paper: "#FFFFFF", // slash core
  accent: BRAND.brand.accent,
  // OG / dark surfaces
  night: ["#0F172A", "#0B0B0F"],
  dawn: ["#FFF7ED", "#FFEDD5"],
}

// ── BADGE (the only per-brand art) ───────────────────────────────────────────
// Drawn in a 0..512 box. `ring` = outer ring + slash outline, `core` = slash
// centre. `detail:false` is the favicon path: drops the palm, sun and foam so
// 16px shows sky / sea / island / slash only. `uid` keeps gradient ids unique
// when several badges share one SVG (lockups, OG).
function BADGE({ ring = M.ink, core = M.paper, detail = true, uid = "b" } = {}) {
  const s = M.scene
  return `<defs>
    <linearGradient id="${uid}-sky" x1="0" y1="40" x2="0" y2="330" gradientUnits="userSpaceOnUse"><stop stop-color="${s.sky[0]}"/><stop offset=".55" stop-color="${s.sky[1]}"/><stop offset="1" stop-color="${s.sky[2]}"/></linearGradient>
    <linearGradient id="${uid}-sea" x1="0" y1="330" x2="0" y2="472" gradientUnits="userSpaceOnUse"><stop stop-color="${s.sea[0]}"/><stop offset="1" stop-color="${s.sea[1]}"/></linearGradient>
    <clipPath id="${uid}-disc"><circle cx="256" cy="256" r="214"/></clipPath>
  </defs>
  <circle cx="256" cy="256" r="244" fill="${ring}"/>
  <g clip-path="url(#${uid}-disc)">
    <rect width="512" height="512" fill="url(#${uid}-sky)"/>
    ${detail ? `<circle cx="330" cy="286" r="58" fill="${s.sun}" opacity=".9"/>` : ""}
    <rect y="330" width="512" height="182" fill="url(#${uid}-sea)"/>
    ${detail ? `<path d="M40 368c40-14 80-14 120 0s80 14 120 0 80-14 120 0 80 14 120 0" stroke="${s.foam}" stroke-width="10" stroke-linecap="round" opacity=".7"/>` : ""}
    <ellipse cx="236" cy="340" rx="150" ry="40" fill="${s.grass}"/>
    <ellipse cx="236" cy="352" rx="150" ry="28" fill="${s.sand}"/>
    ${detail ? `<path d="M232 344c-6-60 2-118 30-166" stroke="${s.trunk}" stroke-width="18" stroke-linecap="round"/>
    <g fill="${s.leaf}">
      <path d="M262 176c-40-30-92-28-120 6 38-8 76 0 120-6z"/>
      <path d="M262 176c28-40 78-50 112-24-38 0-72 8-112 24z"/>
      <path d="M262 176c-14-44-50-70-90-64 30 18 54 38 90 64z"/>
      <path d="M262 176c40 2 76 30 84 70-26-28-50-46-84-70z"/>
      <path d="M262 176c-36 6-64 36-66 76 20-30 38-50 66-76z"/>
    </g>` : ""}
  </g>
  <circle cx="256" cy="256" r="214" stroke="${ring}" stroke-width="6"/>
  <path d="M96 96L416 416" stroke="${ring}" stroke-width="64" stroke-linecap="round"/>
  <path d="M96 96L416 416" stroke="${core}" stroke-width="30" stroke-linecap="round"/>`
}

// Single-colour silhouette for mono/print: ring, island, slash — no scene fill.
const MONO = `<circle cx="256" cy="256" r="229" stroke="currentColor" stroke-width="30"/>
  <path d="M86 340h340" stroke="currentColor" stroke-width="20" stroke-linecap="round"/>
  <ellipse cx="236" cy="336" rx="130" ry="26" fill="currentColor"/>
  <path d="M232 330c-6-56 2-110 30-154" stroke="currentColor" stroke-width="18" stroke-linecap="round"/>
  <path d="M262 176c-40-30-92-28-120 6 38-8 76 0 120-6zM262 176c28-40 78-50 112-24-38 0-72 8-112 24zM262 176c40 2 76 30 84 70-26-28-50-46-84-70z" fill="currentColor"/>
  <path d="M96 96L416 416" stroke="currentColor" stroke-width="40" stroke-linecap="round"/>`

// ── Generic machinery ────────────────────────────────────────────────────────
const grad = (id, a, b, x2, y2) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const open = (w, h, label) =>
  `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">`
const W = (f, s) => writeFileSync(`${OUT}/${f}`, s)
const n = M.name
const badgeFile = (opts) => `${open(512, 512, M.label)}\n  ${BADGE(opts)}\n</svg>\n`

// Variants: the scene never changes; the ring/slash swap for the surface.
W("icon.svg", badgeFile()) // primary — also the extension icon source (see ../Taskfile.yml `icons`)
W(`${n}-icon.svg`, badgeFile())
W(`${n}-icon-dark.svg`, badgeFile({ ring: M.ink, core: M.paper })) // on bright surfaces
W(`${n}-icon-light.svg`, badgeFile({ ring: M.paper, core: M.ink })) // on dark surfaces
W("favicon.svg", badgeFile({ detail: false }))
W(`${n}-glyph.svg`, badgeFile())
W(`${n}-mono.svg`, `${open(512, 512, M.label)}\n  ${MONO}\n</svg>\n`)

const wordmark = (fill) =>
  `<text x="0" y="104" font-family="${M.fonts.display}" font-size="112" font-weight="600" letter-spacing="-4" fill="${fill}">${n}</text>`
W(`${n}-wordmark.svg`, `${open(820, 140, M.label)}\n  ${wordmark(M.ink)}\n</svg>\n`)

const lockup = (uid, textFill, ring, core) =>
  `${open(1000, 200, M.label)}
  <g transform="translate(20,36) scale(0.25)">${BADGE({ uid, ring, core })}</g>
  <text x="176" y="132" font-family="${M.fonts.display}" font-size="104" font-weight="600" letter-spacing="-4" fill="${textFill}">${n}</text>
</svg>
`
W(`${n}-lockup.svg`, lockup("l1", M.ink, M.ink, M.paper))
W(`${n}-lockup-dark.svg`, lockup("l2", M.dawn[0], M.paper, M.ink))

const og = (file, [bgA, bgB], main, sub1, sub2, ring, core) =>
  W(file, `${open(1200, 630, M.label)}
  <defs>${grad("og-bg", bgA, bgB, 1200, 630)}</defs>
  <rect width="1200" height="630" fill="url(#og-bg)"/>
  <g transform="translate(96,182) scale(0.52)">${BADGE({ uid: "og", ring, core })}</g>
  <text x="412" y="292" font-family="${M.fonts.display}" font-size="96" font-weight="600" letter-spacing="-4" fill="${main}">${n}</text>
  <rect x="416" y="324" width="86" height="8" rx="4" fill="${M.accent}"/>
  <text x="414" y="392" font-family="${M.fonts.display}" font-size="38" font-weight="500" fill="${sub1}">${M.tagline}</text>
  <text x="414" y="446" font-family="${M.fonts.display}" font-size="26" font-weight="400" fill="${sub2}">${M.subline}</text>
</svg>
`)
og("og-cover.svg", M.night, "#FFFFFF", "#FDE68A", "#CBD5E1", M.paper, M.ink)
og("og-cover-light.svg", M.dawn, M.ink, "#9A3412", "#57534E", M.ink, M.paper)

// Chrome Web Store promo tile (440x280): badge + name, on the night background.
W("store-promo-small.svg", `${open(440, 280, M.label)}
  <defs>${grad("st-bg", M.night[0], M.night[1], 440, 280)}</defs>
  <rect width="440" height="280" fill="url(#st-bg)"/>
  <g transform="translate(150,40) scale(0.27)">${BADGE({ uid: "st", ring: M.paper, core: M.ink })}</g>
  <text x="220" y="232" text-anchor="middle" font-family="${M.fonts.display}" font-size="34" font-weight="600" letter-spacing="-1" fill="#FFFFFF">${M.label}</text>
</svg>
`)

W("tokens.css", `:root{
  --${n}-ink:${M.ink}; --${n}-paper:${M.paper}; --${n}-accent:${M.accent};
  --${n}-sky-a:${M.scene.sky[0]}; --${n}-sky-b:${M.scene.sky[1]}; --${n}-sky-c:${M.scene.sky[2]};
  --${n}-sea-a:${M.scene.sea[0]}; --${n}-sea-b:${M.scene.sea[1]};
  --${n}-grass:${M.scene.grass}; --${n}-sand:${M.scene.sand};
  --${n}-bg:${M.dawn[0]}; --${n}-fg:${M.ink};
  --${n}-font-display:${M.fonts.display};
  --${n}-font-sans:${M.fonts.sans};
  --${n}-font-mono:${M.fonts.mono};
  --${n}-radius:50%;
}
[data-theme="dark"], .dark{ --${n}-bg:${M.night[1]}; --${n}-fg:${M.paper}; }
`)

W("palette.json", `${JSON.stringify({ name: n, ink: M.ink, paper: M.paper, accent: M.accent, scene: M.scene, surfaces: { dark: M.night, light: M.dawn } }, null, 2)}\n`)
W("tokens.json", `${JSON.stringify({ name: n, color: { ink: M.ink, paper: M.paper, accent: M.accent, scene: M.scene }, font: { display: BRAND.fonts.display, sans: BRAND.fonts.sans, mono: BRAND.fonts.mono, stack: M.fonts }, radius: { badge: "50%" }, icon: { extension: [16, 32, 48, 128], favicon: [16, 32, 48, 180, 512], og: [1200, 630], store: [[440, 280]] } }, null, 2)}\n`)

console.log(`✓ ${n} brand kit written to ${OUT}`)
