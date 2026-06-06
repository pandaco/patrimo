# ADR 001 — FIFO realized P&L (cost-basis-aware)

**Status:** Accepted — `fe44eb7` (2026-06-06)
**Scope:** `libs/web/features/src/lib/portfolio/realized-pnl.ts`
**Replaces:** the inline `closedPositions` aggregation in `portfolio.component.ts` (sweeps `54e0a43`).

---

## Context

The Portfolio page surfaces a **"PV réalisée YTD"** tile and a **Closed positions** card. Both need a realized P&L figure derived from the user's transaction history. The naive aggregation (`Σ sell_amount − Σ buy_amount` per ETF) is wrong as soon as:

- the position is partially sold (no per-share basis allocation),
- there are multiple BUY lots at different prices (no cost-basis ordering),
- broker fees are non-zero (fees live in a separate column, not folded into `amount`),
- a CSV row has `qty = 0` or `amount = 0` (division by zero → `NaN` poisons the whole figure),
- a SELL and a BUY happen on the same date (DB returns `ORDER BY date DESC` with no tiebreaker, so `Array.sort` ascending preserves the input order and the SELL processes before the BUY → realized leg dropped).

We surfaced these in the §14 code review (10 findings, 5 critical to the dollar figure).

## Decision

Replace the ad-hoc per-component aggregation with a single pure function:

```ts
computeRealized(txs: Transaction[], sinceDate: string): RealizedReport
```

defined in `libs/web/features/src/lib/portfolio/realized-pnl.ts`, returning:

```ts
interface RealizedReport {
  realizedSince:   number;             // P&L on sells dated >= sinceDate
  orphanSellUnits: number;             // units sold without a prior BUY
  orphanSellCount: number;             // SELL txs with ≥1 orphan unit
  closedPositions: ClosedPosition[];   // fully-exited ETFs
}
```

### Algorithm

1. **Filter + rank.** Keep only BUY/SELL with `qty > 0` and a non-null ETF. Sort ascending by `(date, type)` where same-day BUYs precede same-day SELLs.
2. **Per-ETF FIFO queue.** For each row in order:
   - **BUY** → push `{ qty, netCostPerUnit = (amount + fees) / qty }`.
   - **SELL** → drain `remaining = qty` units from the oldest lots first. For each take, if `tx.date >= sinceDate`, add `take × (netSellPerUnit − lot.netCostPerUnit)` to `realizedSince` where `netSellPerUnit = (amount − fees) / qty`.
3. **Orphans.** When a SELL exits its loop with `remaining > 1e-9`, the remainder counts as an orphan (no prior BUY to match) and the SELL row counts once toward `orphanSellCount`.
4. **Closed positions.** After the full walk, an ETF whose lot queue is empty *and* whose stats recorded at least one SELL is exposed as a `ClosedPosition` with fee-aware totals (lifetime, not windowed).
5. **Guards.** Any per-unit price that is non-finite (`qty=0` slipped past the filter, or `amount` was nonsense) is silently skipped — the row contributes nothing rather than poisoning the running total.

### Why FIFO, not weighted-average?

Two reasons:

- **French tax alignment.** PEA/CTO P&L declarations to the *Direction Générale des Finances Publiques* use FIFO per ISIN. Reporting a different figure on screen would create a reconciliation cost at tax time.
- **Determinism.** FIFO produces the same number regardless of order of computation; weighted-average requires snapshotting a running mean and is sensitive to the order in which lots are merged.

If a user wants weighted-average semantics for their own reasoning, they can derive it from the lot stream — but the on-screen tile must match what they will declare.

### Why same-day BUY-before-SELL?

The TypeORM repo returns `ORDER BY date DESC` with no secondary sort, so within a single day rows come back in physical-insertion order — usually SELL first when the user creates a round trip. A naïve ascending sort by `date` alone is stable and preserves that wrong order. Forcing `(date asc, type=BUY first)` resolves intraday round trips without changing the database query.

### Why fee-aware?

`amount` in `TransactionDto` is gross (`qty × price`). `fees` lives in a separate column. Lifetime realized P&L without fees overstates by `Σ buy_fees + Σ sell_fees` on matched lots — for an account paying €5 per trade across 50 round-trips that is +€500 of phantom gain. Folding fees into the per-unit basis collapses both legs into a single number consistent with tax reporting.

## Consequences

- **The number on screen is now correct under partial sells, mixed cost bases, intraday round trips, and non-zero fees.** Covered by 15 vitest specs in `realized-pnl.spec.ts`.
- **Both cards share one walk.** `realizedYtd`, `orphanSellCount`, `orphanSellUnits`, and `closedPositions` derive from a single memoized computed signal in `portfolio.component.ts` keyed on `txSvc.all()`. A future basis tweak lands in one file and both views update together.
- **Orphan sells are surfaced** as a `pill warn` under the YTD tile with `aria-label`/`title` explaining that those units have no recorded cost basis. This replaces the silent under-report.
- **CSV import is the upstream gate.** `TransactionService.importCsv` now rejects rows with `amount <= 0` or, for BUY/SELL, `qty <= 0` or missing ETF, and reports the count via `{ count, skipped }`. The frontend toast says `"N transactions importées (M lignes ignorées)"`.
- **What we are NOT solving here:** holidays in market-state logic, weighted-average mode, lots merged across envelopes (PEA + CTO of the same ETF are treated as one FIFO queue today — fine for total P&L, not for envelope-scoped tax reporting). Future ADRs if needed.

## Edge cases worth knowing

| Case                                 | Behaviour                                                              |
|--------------------------------------|------------------------------------------------------------------------|
| BUY with `qty = 0`                   | Skipped (no lot pushed, no contribution).                              |
| SELL with `qty = 0`                  | Skipped.                                                               |
| SELL with no prior BUY               | `orphanSellCount += 1`, `orphanSellUnits += qty`, realized unchanged.  |
| SELL partially matched               | Matched units contribute to realized; remainder counts as orphan.      |
| BUY + SELL same date                 | BUY runs first; same-day round trip resolves correctly.                |
| `amount` poisoned to gibberish       | Per-unit price evaluates to non-finite → row skipped.                  |
| ETF held across two envelopes        | Treated as one FIFO queue keyed on ISIN (no envelope dimension).       |
