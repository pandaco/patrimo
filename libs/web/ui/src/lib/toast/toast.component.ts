import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@patrimo/data-access';

@Component({
  selector: 'ui-toast',
  standalone: true,
  template: `
    @if (toasts.current(); as t) {
      <div class="ui-toast"
           role="status"
           [class.ok]="t.ok"
           [class.err]="!t.ok">
        <span>{{ t.text }}</span>
        <button type="button"
                class="ui-toast-close"
                aria-label="Fermer le message"
                (click)="toasts.dismiss()">×</button>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toasts = inject(ToastService);
}
