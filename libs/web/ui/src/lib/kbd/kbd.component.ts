import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-kbd',
  standalone: true,
  template: `<kbd class="kbd"><ng-content /></kbd>`,
  styles: `
    .kbd {
      font-family: var(--font-mono);
      font-size: 10.5px;
      background: var(--paper-2);
      border: 1px solid var(--rule);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--ink-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KbdComponent {}
