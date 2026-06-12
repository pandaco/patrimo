import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateEnvelopeDto } from '@patrimo/contracts';
import { Envelope, EnvelopeService } from '@patrimo/data-access';

interface GlyphOption { value: string; label: string }

export interface EnvelopeDialogData {
  envelope?: Envelope;
  /** Pre-select the envelope type (e.g. when created from a family header). */
  presetGlyph?: string;
}

const GLYPHS: GlyphOption[] = [
  { value: 'pea',    label: 'PEA (compte boursier)' },
  { value: 'peapme', label: 'PEA-PME' },
  { value: 'cto',    label: 'CTO (compte-titres)' },
  { value: 'av',     label: 'Assurance-vie' },
  { value: 'per',    label: 'PER' },
  { value: 'pee',    label: 'PEE / PEA salariés' },
  { value: 'livret', label: 'Livret réglementé' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'immo',   label: 'Immobilier / SCPI' },
  { value: 'metal',  label: 'Métaux précieux' },
];

@Component({
  selector: 'app-envelope-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './envelope-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvelopeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EnvelopeDialogComponent>);
  private readonly data      = inject<EnvelopeDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly envelopeService    = inject(EnvelopeService);

  protected readonly editing   = !!this.data?.envelope;
  private readonly editingId   = this.data?.envelope?.id ?? null;

  protected readonly glyphs = GLYPHS;

  protected code     = signal(this.data?.envelope?.code ?? '');
  protected glyph    = signal(this.data?.envelope?.glyph ?? this.data?.presetGlyph ?? 'pea');
  protected label    = signal(this.data?.envelope?.label ?? '');
  protected broker   = signal(this.data?.envelope?.broker ?? '');
  protected openedAt = signal(this.data?.envelope?.openedAt ?? new Date().toISOString().slice(0, 10));
  protected plafond  = signal<number | null>(this.data?.envelope?.plafond ?? null);

  protected readonly submitting = signal(false);
  protected readonly error      = signal<string | null>(null);

  protected close(): void { this.dialogRef.close(); }

  protected async save(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);

    const code   = this.code().trim();
    const label  = this.label().trim();
    const broker = this.broker().trim();
    const glyph  = this.glyph().trim();

    if (!code || !label || !broker || !glyph) {
      this.error.set('Code, label, broker et glyph sont obligatoires.');
      return;
    }

    const payload: CreateEnvelopeDto = {
      code,
      glyph,
      label,
      broker,
      openedAt: this.openedAt(),
      plafond: this.plafond(),
    };

    this.submitting.set(true);
    try {
      if (this.editing && this.editingId) {
        await this.envelopeService.update(this.editingId, payload);
      } else {
        await this.envelopeService.create(payload);
      }
      this.dialogRef.close('saved');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      this.submitting.set(false);
    }
  }
}
