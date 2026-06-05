import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KbdComponent } from 'ui';

@Component({
  selector: 'app-gmode-badge',
  standalone: true,
  imports: [KbdComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-live="polite" class="gmode-badge">
      <ui-kbd>G</ui-kbd>
      <span style="color:rgba(255,255,255,0.7)">puis</span>
      <span style="color:rgba(255,255,255,0.7)">D · W · P · T · L · F · C · M · A · R</span>
    </div>
  `,
  styles: [`
    .gmode-badge {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ink);
      color: #fff;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 60;
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.4);
      animation: fade-in 0.12s ease;
    }
    @keyframes fade-in { from { opacity: 0; transform: translateX(-50%) translateY(4px); } }
  `],
})
export class GModeBadgeComponent {}
