# ADR 005 — Period variation: market gain excluding contributions, on the financial wealth

**Status:** Accepted (2026-10-28)
**Scope:** `PerformanceService.getPeriodVariation` and `getWealthSeries` (`libs/api/application/src/lib/performance/performance.service.ts`), `PeriodVariationDto` / `WealthSeriesDto.financial` (`libs/shared/contracts`), the dashboard, Patrimoine and Portefeuille views that display them.
**Spec:** `tmp/variation-periode/spec.md` (private planning doc).

---

## Context

The question the views must answer is "where am I winning and where am I losing over the period I chose". Before this change:

1. The positions table only showed the daily move and the PV latente since purchase. Nothing told what a line did since January.
2. The headline was the net patrimoine: every envelope, including current-account cash, minus loans. A deposit on a current account moved it as much as a market rally did.

Two definitions had to be fixed: what a "variation over the period" is, and which wealth it is measured on.

## Decision

### Variation = market gain excluding contributions

For a line (position, envelope or total) over a window:

- **€** = end value − start value − net contributions inside the window. A contribution is a buy/sell for securities and a deposit/withdrawal for balances (livrets). A deposit is never a gain, a withdrawal or a sale never a loss.
- **%** = € ÷ (opening value + net contributions), the gain over the money at work.
- Values are taken on a **clean base**: securities at quantity × close, livrets at their balance. Uninvested cash sitting in a boursier envelope is not part of the base.
- A line bought mid-window is measured from its first purchase. A line sold mid-window keeps the gain it made while held.

The computation reuses the `periodReturn` helper behind the wealth-series returns, so the per-envelope figures reconcile with the returns the dashboard already showed.

### Financial wealth scope

The single displayed scope is **securities + livrets** across PEA, PEA-PME, CTO, AV, PER, PEE. Current-account cash, immobilier, crypto and métaux are outside it, and liabilities are not deducted. There is no net/gross toggle. The dashboard headline, its curve (`WealthSeriesDto.financial`), the Patrimoine envelope table and the strip all read figures built on this same base, so a total never disagrees between two screens.

## Considered options

- **Time-weighted % (modified Dietz), as the spec first proposed.** Rejected for the displayed %. When most of the capital is deployed late in a long window, the time-weighted denominator shrinks toward zero and the ratio explodes (a "+294 %" on a modest euro gain). The untimed ratio stays the intuitive "I put in X, I gained Y". The time-weighted figure is still computed (`twrPct`) and remains the one compared to an index on the dashboard performance line.
- **% over end value.** Rejected: a large late deposit dilutes it toward 0 %.
- **Keep the net patrimoine headline with a toggle.** Rejected: one scope, one set of numbers. Idle cash and loans were noise for the decision the page supports.

## Consequences

- `PeriodVariationDto` exposes two totals: `total` (securities + livrets) and `positionsTotal` (securities only, for the positions table, which lists no livret).
- A `variationPct` of `null` means "not computable" (base under 100 €, no history). The UI shows a dash and sorts the line last, never a misleading 0 %.
- **Known gap:** fonds euros have no dedicated model. Inside an AV they sit in the envelope's cash, which the clean boursier base leaves out, so they are currently **outside** the financial scope. Fix by modelling fonds euros explicitly, or by counting AV cash as fonds euros. Either change touches every figure listed in Scope.
- Liabilities are hidden from the UI only. Their table, endpoints and data are untouched and can be brought back.
- Non-goals: tax effects, fees and realised P&L are not part of the variation figure. They stay in the existing Bilan/fiscalité cards.
