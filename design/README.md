# Explorer design — v2

The target design for `explorer-ui`. **This folder is the source of truth for what the
explorer should look like** — when code and these files disagree, the files win.

Live, pannable version: https://claude.ai/code/artifact/abae8176-aaf5-4f04-aeb3-012d76752411
(open the **explorer — v2** page from the pages menu).

It shares its design system with `webapp-ui` — same palette, type, radii and brand. The
wallet's `design/` folder holds the full system and the identity sheet.

## Pointing Claude at it

Name the screen, not "the design":

> Make `src/components/home/AnonymitySets.tsx` match `design/screens/withdrawal-cover.dc.html`.

## Screens

| Canvas title | File |
|---|---|
| Dashboard | `screens/dashboard.dc.html` |
| Withdrawal anonymity | `screens/withdrawal-cover.dc.html` |
| Feed + registry | `screens/feed-and-registry.dc.html` |
| Chart system | `screens/chart-system.dc.html` |
| Dashboard — warm paper | `screens/dashboard.paper.dc.html` |
| What carries over | `screens/what-carries-over.dc.html` |

- **`dashboard.paper`** is the light theme. Dark is the default.
- **`chart-system`** documents the chart series palette and the rules it forces — a
  legend on every chart, 2px gaps between fills, a dashed outflow line. Those rules
  exist because deposit and withdraw separate by only ΔE 7.5 under deuteranopia.
- **`what-carries-over`** is the audit of wallet improvements against this app, not a
  screen.

## Chart colours

Generated in OKLCH and run through a palette validator until every check passed in both
themes. Do not adjust them by eye.

| Series | Dark | Light |
|---|---|---|
| deposit / inflow | `#0083a0` | `#007aa8` |
| transfer | `#7b5fc9` | `#7444b4` |
| withdraw / outflow | `#d66e31` | `#b84c00` |
| pending | `#c2538a` | `#b3346b` |

## Reading these files

Each `.dc.html` is one artboard from the design canvas. **They do not render on their
own** — they reference `./support.js`, which only exists inside the canvas editor. Use
the link above to *see* a screen; open the file as text to *read* exact values, all of
which are inline styles.
