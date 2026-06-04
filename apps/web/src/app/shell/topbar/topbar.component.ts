import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppIconComponent } from 'ui';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  crumbs = input.required<string[]>();
  newTransaction = output<void>();
}
