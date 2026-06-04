import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

const NAV_MAP: Record<string, string> = {
  d: '/dashboard',
  w: '/wealth',
  p: '/portfolio',
  t: '/transactions',
  l: '/allocation',
  f: '/performance',
  c: '/tools/calendar',
  m: '/tools/compare',
  a: '/tools/alerts',
  r: '/tools/glossary',
};

const G_MODE_TIMEOUT_MS = 1200;

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  private readonly router   = inject(Router);
  private readonly dialog   = inject(MatDialog);
  private readonly document = inject(DOCUMENT);

  readonly gMode = signal(false);

  private gTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handler = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    this.document.addEventListener('keydown', this.handler);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', this.handler);
      this.clearGMode();
    });
  }

  private onKey(e: KeyboardEvent): void {
    // Zoneless app: there is no NgZone to re-enter — signal writes and
    // Router.navigate already schedule change detection on their own. The
    // `keydown` listener does run outside Angular (Document is a real DOM
    // node, not an NgZone-patched one) but with `provideZonelessChangeDetection`
    // that does not matter: only signal/reactivity APIs drive the renderer.
    if (e.key === 'Escape') {
      this.dialog.closeAll();
      this.clearGMode();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.document.querySelector<HTMLInputElement>('input[data-search]')?.focus();
      return;
    }

    if (isEditingTarget(e.target)) return;

    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      this.openShortcuts();
      return;
    }

    if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      this.openTx();
      return;
    }

    if (e.key.toLowerCase() === 'g' && !this.gMode()) {
      this.gMode.set(true);
      this.gTimer = setTimeout(() => this.clearGMode(), G_MODE_TIMEOUT_MS);
      return;
    }

    if (this.gMode()) {
      const route = NAV_MAP[e.key.toLowerCase()];
      if (route) {
        e.preventDefault();
        this.router.navigate([route]);
        this.clearGMode();
      }
    }
  }

  private clearGMode(): void {
    this.gMode.set(false);
    if (this.gTimer) { clearTimeout(this.gTimer); this.gTimer = null; }
  }

  async openTx(): Promise<void> {
    const { TransactionDialogComponent } = await import('../transaction-dialog/transaction-dialog.component');
    this.dialog.open(TransactionDialogComponent, { panelClass: 'tx-dialog-panel', maxWidth: '580px', width: '100%' });
  }

  async openShortcuts(): Promise<void> {
    const { ShortcutsDialogComponent } = await import('./shortcuts-dialog.component');
    this.dialog.open(ShortcutsDialogComponent, { maxWidth: '480px', width: '100%' });
  }
}
