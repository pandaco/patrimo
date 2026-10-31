# ADR 006 — Life insurance: the cash of an AV with ETF purchases is its fonds euros

**Status:** Accepted (2026-10-31)
**Scope:** `PerformanceService.getPeriodVariation` and `getWealthSeries` for envelopes of type AV that hold ETF purchases.
**Spec:** `tmp/variation-periode/spec.md` (private planning doc). Follows up the known gap of [ADR 005](005-period-variation-financial-scope.md).

---

## Context

An assurance-vie has no cash pocket like a PEA. Money is spread over supports: the fonds euros (guaranteed capital, interest credited once a year) and the unités de compte (ETFs and funds). Money waiting to be invested sits in the fonds euros.

In Patrimo the ETFs of an AV are transactions, so its positions are replayed. The cash left (deposits − purchases − withdrawals + interest) is not a position and was left out of the clean boursier base, hence out of the financial wealth. No existing AV is in this shape today (they are declared values), but one is planned.

## Decision

For an AV that holds at least one ETF purchase, its cash balance is counted as its fonds euros, in the financial wealth and in its envelope total.

- The **variation** of that line over a period is the interest entered as operations in the period. A deposit is never a gain, a withdrawal never a loss.
- An AV with no ETF purchase keeps the declared-balance behaviour of ADR 005.
- Other envelope types are unchanged: their idle cash stays outside the base.

## Considered options

- **Do nothing.** Rejected: the fonds euros would silently vanish from the total once the AV mixes both.
- **Dedicated fonds euros line.** Deferred: a new entity and screens for a case that does not exist yet.
- **Dated valuations of the fonds euros.** Rejected as heavier than the need; interest as operations is enough.

## Consequences

- Interest is credited once a year, so over YTD the fonds euros variation is zero until the credit, then jumps. This is expected, not a bug.
- The user must enter the yearly interest as an operation for the variation to show it.
- Touches every figure of ADR 005's scope; implemented in ticket 13.
