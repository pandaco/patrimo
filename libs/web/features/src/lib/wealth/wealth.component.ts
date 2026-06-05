import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EnvelopeService, Envelope } from '@patrimo/data-access';
import { DeltaComponent, EnvGlyphComponent, fmtEur, fmtPctRaw } from '@patrimo/ui';

interface Family { label: string; glyphs: string[]; color: string }

// Families are matched by `glyph` (a stable, finite vocabulary) rather than
// the mock envelope ids that disappeared once envelopes started living in
// Postgres with UUID primary keys.
const FAMILIES: Family[] = [
  { label: 'Comptes boursiers',         glyphs: ['pea','peapme','cto'],  color: '#16A34A' },
  { label: 'Assurance-vie & retraite',  glyphs: ['av','per','pee'],      color: '#7C3AED' },
  { label: 'Épargne réglementée',       glyphs: ['livret'],              color: '#CA8A04' },
  { label: 'Autres placements',         glyphs: ['crypto','immo','metal'], color: '#DC2626' },
];

export interface FamilyRow {
  family: Family;
  envelopes: Envelope[];
  value: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  pct: number;
}

@Component({
  selector: 'app-wealth',
  standalone: true,
  imports: [DeltaComponent, EnvGlyphComponent],
  templateUrl: './wealth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WealthComponent {
  private readonly envSvc = inject(EnvelopeService);
  private readonly dialog = inject(MatDialog);

  protected readonly total    = this.envSvc.total;
  protected readonly allEnv   = this.envSvc.all;

  protected readonly families = computed<FamilyRow[]>(() => {
    const all   = this.allEnv();
    const total = this.total();
    return FAMILIES.map(f => {
      const envelopes = all.filter(e => f.glyphs.includes(e.glyph));
      const value     = envelopes.reduce((a, e) => a + e.value, 0);
      const invested  = envelopes.reduce((a, e) => a + e.invested, 0);
      const pnl       = value - invested;
      return {
        family: f,
        envelopes,
        value,
        invested,
        pnl,
        pnlPct: invested ? (pnl / invested) * 100 : 0,
        pct:    total    ? (value / total) * 100 : 0,
      };
    });
  });

  protected readonly fmtEur    = fmtEur;
  protected readonly fmtPctRaw = fmtPctRaw;

  protected pnl(env: Envelope)    { return env.value - env.invested; }
  protected pnlPct(env: Envelope) { return env.invested ? (env.value / env.invested - 1) * 100 : 0; }
  protected capPct(env: Envelope) { return env.plafond  ? (env.value / env.plafond) * 100 : null; }

  protected async openNewEnvelope(): Promise<void> {
    const { EnvelopeDialogComponent } = await import('@patrimo/ui');
    this.dialog.open(EnvelopeDialogComponent, {
      panelClass: 'tx-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async openEditEnvelope(env: Envelope): Promise<void> {
    const { EnvelopeDialogComponent } = await import('@patrimo/ui');
    this.dialog.open(EnvelopeDialogComponent, {
      data: { envelope: env },
      panelClass: 'tx-dialog-panel',
      maxWidth: '580px',
      width: '100%',
    });
  }

  protected async deleteEnvelope(env: Envelope): Promise<void> {
    if (!confirm(
      `Supprimer l'enveloppe « ${env.label} » ?\n\n` +
      `Cette action est irréversible et supprime AUSSI toutes les transactions ` +
      `enregistrées sur cette enveloppe.`,
    )) return;
    try {
      // EnvelopeService.remove() fans the cascade reload (transactions + positions)
      // out internally — the component does not need to chain them itself.
      await this.envSvc.remove(env.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }
}
