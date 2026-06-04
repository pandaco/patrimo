import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { KbdComponent } from 'ui';

const SHORTCUTS = [
  { keys: ['⌘', 'K'],  label: 'Recherche globale' },
  { keys: ['N'],        label: 'Nouvelle transaction' },
  { keys: ['G', 'D'],  label: 'Aller au tableau de bord' },
  { keys: ['G', 'W'],  label: 'Patrimoine' },
  { keys: ['G', 'P'],  label: 'Portefeuille' },
  { keys: ['G', 'T'],  label: 'Transactions' },
  { keys: ['G', 'L'],  label: 'Allocation' },
  { keys: ['G', 'F'],  label: 'Performance' },
  { keys: ['G', 'C'],  label: 'Calendrier' },
  { keys: ['G', 'M'],  label: 'Comparateur ETF' },
  { keys: ['G', 'A'],  label: 'Alertes' },
  { keys: ['G', 'R'],  label: 'Glossaire' },
  { keys: ['?'],        label: 'Afficher cette aide' },
  { keys: ['Esc'],      label: 'Fermer un dialogue' },
];

@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  imports: [KbdComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div class="modal-head">
        <div>
          <div style="font-size:11.5px;font-weight:500;color:var(--ink-3);margin-bottom:4px">Aide clavier</div>
          <div class="modal-title" id="shortcuts-title">Raccourcis</div>
        </div>
        <button id="shortcuts-close" class="btn ghost sm" (click)="close()"
          style="margin-left:auto" aria-label="Fermer">✕</button>
      </div>
      <div class="modal-body" style="padding:16px 26px 22px">
        @for (s of shortcuts; track s.label; let last = $last) {
          <div class="row" style="padding:8px 0" [style.border-bottom]="last ? 'none' : '1px solid var(--rule-soft)'">
            <span style="font-size:13.5px;flex:1">{{ s.label }}</span>
            <span style="display:flex;gap:4px;align-items:center">
              @for (k of s.keys; track $index) {
                @if ($index > 0) {
                  <span style="color:var(--ink-3);font-size:11px">puis</span>
                }
                <ui-kbd>{{ k }}</ui-kbd>
              }
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class ShortcutsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ShortcutsDialogComponent>);
  protected readonly shortcuts = SHORTCUTS;
  protected close() { this.dialogRef.close(); }
}
