import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-kbd',
  standalone: true,
  template: `<kbd class="kbd"><ng-content /></kbd>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KbdComponent {}
