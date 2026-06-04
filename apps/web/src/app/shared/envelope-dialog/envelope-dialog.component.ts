import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateEnvelopeDto } from 'contracts';
import { EnvelopeService } from 'data-access';

interface GlyphOption { value: string; label: string }

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
  private readonly envSvc    = inject(EnvelopeService);

  protected readonly glyphs = GLYPHS;

  protected code     = signal('');
  protected glyph    = signal('pea');
  protected label    = signal('');
  protected broker   = signal('');
  protected openedAt = signal(new Date().toISOString().slice(0, 10));
  protected plafond  = signal<number | null>(null);

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
      await this.envSvc.create(payload);
      this.dialogRef.close('saved');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      this.submitting.set(false);
    }
  }
}
