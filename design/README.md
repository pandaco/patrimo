# Patrimonia — Design Prototype

Clickable HTML/JSX prototype handed off from Claude Design (claude.ai/design). Source of truth for visual design, layout, copy and interactions until the Angular implementation lands.

> ⚠️ **This is a design prototype, not production code.**
> React + Babel are used in the browser only as a render engine to make the screens clickable. The real implementation target is **Angular 21.2 (standalone, signals, SCSS)**. Port plan in [`../tmp/angular-port-plan.md`](../tmp/angular-port-plan.md).
>
> 📱 **Responsive scope.** The prototype is **fixed to 1440 px wide** (`<meta name="viewport" content="width=1440">`) on purpose — it's the desktop design source of truth. The Angular implementation must adapt down to **360 px** and up to wide desktops following the breakpoint strategy in [`../tmp/angular-port-plan.md`](../tmp/angular-port-plan.md) §9 (5 breakpoints: 360 / 600 / 900 / 1200 / 1440, mobile-first with bottom navigation under 900 px).

## Files

| File | Role |
|---|---|
| `Patrimonia.html` | Entry point (loads React via UMD + Babel standalone, then all `.jsx` modules) |
| `app.css` | Full theme — design tokens (CSS custom properties), layout, component styles, a11y |
| `data.jsx` | Mock data: envelopes, ETFs, transactions, alerts, glossary, perf series, formatters |
| `shell.jsx` | Sidebar, Topbar, shared atoms (`EnvGlyph`, `Delta`, `Sparkline`, `Bar`, `Donut`, icons) |
| `shortcuts.jsx` | Keyboard shortcuts engine + cheatsheet dialog + `Kbd` |
| `screens-overview.jsx` | `ScreenDashboard`, `ScreenWealth`, `PerfChart` |
| `screens-portfolio.jsx` | `ScreenPortfolio`, `ScreenAllocation`, `ScreenPerf` |
| `screens-transactions.jsx` | `ScreenTransactions` |
| `screens-tools.jsx` | `ScreenDCA`, `ScreenCalendar`, `ScreenCompare`, `ScreenAlerts`, `ScreenGlossary` |
| `modal.jsx` | `TxModal` — new-transaction dialog with type segmented control + pre-validation recap |
| `app.jsx` | Composition root: routing, modals, document title, skip link |

## How to view locally

You only need a static file server (Babel runs in the browser via CDN).

### Option 1 — Python (zero dep)

```bash
cd design
python3 -m http.server 8080
open http://localhost:8080/Patrimonia.html
```

### Option 2 — npx serve

```bash
cd design
npx serve -p 8080 .
```

### Option 3 — VS Code Live Server

Right-click `Patrimonia.html` → *Open with Live Server*.

> Don't open the file via `file://` — Babel standalone requires HTTP for `<script type="text/babel" src="…">` to work.

## What you'll see

11 clickable screens — sidebar groups *Aperçu / Investir / Outils* — plus a new-transaction modal and a keyboard cheatsheet (`?`):

| Group | Screens |
|---|---|
| **Aperçu** | Tableau de bord, Patrimoine |
| **Investir** | Portefeuille, Transactions, Allocation, Performance |
| **Outils** | DCA helper, Calendrier, Comparateur ETF, Alertes, Glossaire |

Keyboard:

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl K` | Focus the global search |
| `N` | Open the *new transaction* modal |
| `G` then `D · W · P · T · L · F · C · M · A · R` | Jump to a screen |
| `?` | Open the shortcuts cheatsheet |
| `Esc` | Close any dialog |

## Design direction

**Modern editorial finance** — direction v2.

- **Type** — [Geist](https://vercel.com/font) sans-serif (300–800 + italic) for everything; **Geist Mono** for tabular numbers. No serif anymore.
- **Surface** — warm-stone neutrals (`#F4F3EF`, `#ECEAE2`), white surface cards, dark ink (`#09090A`).
- **Accent** — vivid financial green `#0F8B3F` (darkened to pass WCAG AA white-on-green); yellow `#FDE047` for highlights in copy; envelope glyphs colored per family (PEA green, CTO orange, AV violet, livret yellow, real-estate red, etc.).
- **Hierarchy** — driven by weight (700 hero) and size (48 px page title, 58 px hero number), not by serif/sans contrast.
- **Accessibility** — WCAG 2.2 AA contrast across the palette, `:focus-visible` rings, skip link, `prefers-reduced-motion` and `prefers-contrast: more` honored, full keyboard nav, ARIA landmarks and `aria-current="page"`.

All values are defined as CSS custom properties at the top of `app.css` — they will port directly to SCSS tokens in the Angular implementation.

## Mock data

Persona used throughout the prototype:

| | |
|---|---|
| Name | Antoine Huet |
| Age | 32 |
| Risk profile | Équilibré dynamique |
| Horizon | 25 years |
| Monthly target | 800 € |
| Wrappers | PEA, PEA-PME, CTO, AV, PER, PEE, Livret A, LDDS, Crypto wallet, SCPI, physical gold (11 in total) |
| ETFs | ESE, CW8, PCEU, PAEEM, RS2K, EWLD, IWDA, OBLI |
| Total value | ~95 962 € |

Mock data is centralised in `data.jsx` and exposed on `window` for cross-module access.

## Out-of-scope screens (designed directly in Angular)

Two screens are **not** part of this prototype (they would have hidden the logged-in flow that the prototype focuses on) and will be designed directly in Angular following the same design tokens (`app.css`):

- **`LoginComponent`** — single-CTA "Continue with Google" centered card. Full spec in [`../tmp/auth.md`](../tmp/auth.md) §5.2.
- **`AuthCallbackComponent`** — invisible safety-net route, only reached on edge cases.

The topbar will gain an **avatar dropdown** on the right (logout, profile, settings) — see [`../tmp/auth.md`](../tmp/auth.md) §5.4.

## When Angular bootstrap is done

Move on to the Angular port. The mapping prototype ↔ Angular standalone components is in [`../tmp/angular-port-plan.md`](../tmp/angular-port-plan.md).
