import { Injectable, signal } from '@angular/core';

export interface Toast { text: string; ok: boolean }

/**
 * App-wide toast / snackbar. A single message is shown at a time — calling
 * `show()` while a previous one is still on screen cancels the pending timer
 * and replaces it. Consumers render `<ui-toast />` once (in the shell) and
 * use `show()` / `dismiss()` from anywhere.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  readonly current = signal<Toast | null>(null);

  show(text: string, ok = true, durationMs = 3500): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.current.set({ text, ok });
    this.timer = setTimeout(() => {
      this.current.set(null);
      this.timer = null;
    }, durationMs);
  }

  success(text: string): void { this.show(text, true); }
  error(text: string):   void { this.show(text, false); }

  dismiss(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.current.set(null);
  }
}
