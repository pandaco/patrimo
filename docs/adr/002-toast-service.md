# ADR 002 — App-wide toast pattern via `ToastService`

**Status:** Accepted — `fe44eb7` (2026-06-06)
**Scope:** `libs/web/data-access/src/lib/toast.service.ts`, `libs/web/ui/src/lib/toast/toast.component.ts`, mounted in `apps/web/src/app/shell/shell.component.html`.
**Replaces:** the hand-rolled toast in `dca.component.ts` (intro'd in `da09d1a`) and the second copy of the same pattern added to `transactions.component.ts` for CSV import feedback.

---

## Context

Two pages had grown a near-identical toast/snackbar:

```ts
// dca.component.ts
protected readonly toastMsg = signal<{ text: string; ok: boolean } | null>(null);
protected showToast(text: string, ok = true): void {
  this.toastMsg.set({ text, ok });
  setTimeout(() => this.toastMsg.set(null), 3000);
}
```

```html
<!-- dca.component.html -->
@if (toastMsg(); as t) {
  <div role="status" style="position:fixed;bottom:24px;right:24px;…"
       [style.background]="t.ok ? 'var(--gain)' : 'var(--loss)'"
       style="color:#fff">
    {{ t.text }}
  </div>
}
```

The Transactions page needed the same thing for CSV import feedback. Two problems:

1. **Drift risk.** Two implementations diverged on the timeout (3000 ms vs 3500 ms), on whether the timer was cleared on destroy (DCA leaked it, Transactions originally leaked it too), and on the inline-style styling.
2. **Page-local mount.** A toast posted from a service or interceptor (e.g. "Session expirée, reconnecte-toi" from `authInterceptor`) had nowhere to render — the templates only existed inside two feature pages.

## Decision

Introduce one DI-scoped `ToastService` in `@patrimo/data-access` and one rendering component `<ui-toast />` in `@patrimo/ui`, mounted **once** in the shell. Any caller (component, service, interceptor) injects the service and calls one of:

```ts
toasts.show(text, ok?, durationMs?);   // catch-all
toasts.success('Plan DCA mensuel programmé.');
toasts.error('Erreur lors de la sauvegarde.');
toasts.dismiss();                       // manual close
```

State is a single `Signal<Toast | null>` — only one toast on screen at a time. `show()` replaces any in-flight toast and resets the timer. The timer is owned by the service and cleared on its own destruction path, so per-component cleanup is no longer required.

## Why a single-slot queue?

The toast is meant for one-shot operation feedback ("import done", "save failed"). Stacking multiple toasts adds layout complexity and competes with the user's attention. If we ever need a real notification centre, that's a different surface (drop-down badge in the top bar), not this one.

If a feature really needs durable multi-message feedback, it should render its own inline status panel, not multiplex through this service.

## Why mount in the shell and not inject a portal?

The shell is the one place every authenticated route renders inside. Mounting `<ui-toast />` there:

- Removes the need for an Angular CDK Overlay (`@angular/cdk/overlay` is not a dep we want to pull in for a 12-line fixed-position div).
- Survives route navigation — a toast posted just before `router.navigate(...)` stays on screen until its own timer expires.
- Keeps the DOM hierarchy obvious: one `<ui-toast />` at the top of `shell.component.html`, period.

The Login route does NOT have the shell — toasts posted from the auth flow stay invisible until the user lands inside the shell. Acceptable trade-off: the only thing that needs to communicate from outside the shell today is the `authInterceptor`, and 401s redirect to login synchronously.

## Accessibility

- `<div role="status">` so screen readers announce the message politely on each `set()`.
- Background colour communicates success/error (`var(--gain)` / `var(--loss)`), but the text itself carries the meaning — no colour-only signal.
- The close button has `aria-label="Fermer le message"` and a `:focus-visible` outline so keyboard users can dismiss without waiting for the timer.

## Consequences

- **One source of truth.** Future feature pages call `inject(ToastService)` and never re-implement the pattern. Future caller from a service or interceptor works for free.
- **DCA + Transactions migrated.** Both feature pages dropped ~10 lines of TS + ~7 lines of inline-styled HTML each.
- **Style lives in `apps/web/src/styles.scss`** under `.ui-toast` / `.ui-toast-close`, alongside other globally-shared primitives (`.ui-switch`, `.heat-cell`). Components in `@patrimo/ui` keep their structure-only templates; visual polish stays in the app's global stylesheet so theming/branding lives in one place.

## What we are NOT solving

- **No queue.** A second `show()` while the first is still on screen replaces it. If product later wants stacking, this is the place to add it.
- **No per-call positioning override.** Position is always bottom-right. Per-toast position would require deciding between Angular CDK Overlay and a hand-rolled stack — not worth the dep yet.
- **No persistent toasts.** All toasts auto-dismiss after `durationMs` (default 3500 ms). For state that should not auto-dismiss — e.g. "Mode hors-ligne" — render an inline banner instead.
