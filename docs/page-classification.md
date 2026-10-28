# Page classification — core vs peripheral

Every route-level page in `libs/web/features`, classified so that any later pruning is a deliberate choice. Nothing is removed by this document.

- **Core**: answers "how is my financial wealth doing, and what should I do next", or is required to feed or reach those answers.
- **Peripheral**: useful, but a secondary analysis, an education aid or a tool the core journey does not depend on.

## Core

| Page (folder) | Route | Rationale |
|---|---|---|
| `dashboard` | `/dashboard` | Headline financial wealth, curve, period performance and best/worst strip. The landing page. |
| `wealth` | `/wealth` | Patrimoine: envelopes, their families and their period variation. Where envelopes are created. |
| `portfolio` | `/portfolio` | Positions table: value, PV latente and period variation per line. |
| `transactions` | `/transactions` | The source of truth: every figure is replayed from these operations. |
| `performance` | `/performance` | Returns per period vs benchmark, the long-run view of the same question. |
| `allocation` | `/allocation` | Target allocation and drift, the "what to do next" side of the portfolio. |
| `login` | `/login` | Google OAuth entry point. |
| `auth-callback` | `/auth/callback` | Completes the OAuth flow. |
| `welcome` | `/welcome` | First-run onboarding (investor profile) for an empty account. |
| `settings` | `/settings/*` | General preferences (display currency, benchmark, risk profile), goals, allocation targets and audit log, all read by the core pages. |

## Peripheral

| Page (folder) | Route | Rationale |
|---|---|---|
| `alerts` | `/tools/alerts` | Full alert list and rules. The dashboard already surfaces the top three. |
| `analyses` | `/tools/analyses/*` | Tab shell for the three analysis pages below. |
| `indicators` | `/tools/analyses/indicators` | KPI tiles (drawdown, doubling time…). Secondary analysis. |
| `cashflow` | `/tools/analyses/cashflow` | Income and dividend flows. Secondary analysis. |
| `projection` | `/tools/analyses/projection` | Future-value simulator. A what-if tool, not a reading of the current wealth. |
| `report` | `/tools/report` | Printable bilan. Occasional export. |
| `dca` | `/tools/dca` | DCA plans. A planning tool, independent of the period views. |
| `calendar` | `/tools/calendar` | Dividend and event calendar. |
| `compare` | `/tools/compare` | Instrument comparator, used before buying rather than to follow the wealth. |
| `glossary` | `/tools/glossary` | Vocabulary reference (education). |
| `tips` | `/tools/tips` | Investing tips (education). |
| `liabilities` | — (redirects to `/dashboard`) | Hidden from the UI since the financial-wealth scope (ADR 005). Data and API kept. |
