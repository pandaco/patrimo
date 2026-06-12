import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateEtfDto, EtfAllocationDto, EtfDto } from '@patrimo/contracts';
import { EtfService, ToastService } from '@patrimo/data-access';

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

@Component({
  selector: 'app-etf-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './etf-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtfDialogComponent {
  private readonly dialogRef  = inject(MatDialogRef<EtfDialogComponent>);
  private readonly etfService = inject(EtfService);
  private readonly toast      = inject(ToastService);

  protected readonly isin    = signal('');
  protected readonly ticker  = signal('');
  protected readonly name    = signal('');
  protected readonly ter     = signal<number | null>(null);
  protected readonly currency = signal('EUR');
  protected readonly distrib = signal<'Capitalisant' | 'Distribuant'>('Capitalisant');
  protected readonly repli   = signal<'' | 'Physique' | 'Synthétique'>('');
  protected readonly issuer  = signal('');
  protected readonly index   = signal('');
  protected readonly pea     = signal(false);
  protected readonly alloc   = signal<EtfAllocationDto>('Core');

  protected readonly submitting = signal(false);

  protected readonly isinValid = computed(() => ISIN_PATTERN.test(this.isin().trim().toUpperCase()));
  protected readonly canSave = computed(() => {
    const ter = this.ter();
    return this.isinValid()
      && this.ticker().trim().length > 0
      && this.name().trim().length > 0
      && ter !== null && ter >= 0 && ter <= 5
      && !this.submitting();
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.submitting.set(true);

    const input: CreateEtfDto = {
      isin: this.isin().trim().toUpperCase(),
      ticker: this.ticker().trim().toUpperCase(),
      name: this.name().trim(),
      ter: this.ter() as number,
      currency: this.currency(),
      distrib: this.distrib(),
      pea: this.pea(),
      alloc: this.alloc(),
      ...(this.repli()  ? { repli: this.repli() }          : {}),
      ...(this.issuer().trim() ? { issuer: this.issuer().trim() } : {}),
      ...(this.index().trim()  ? { index: this.index().trim() }   : {}),
    };

    try {
      const created: EtfDto = await this.etfService.create(input);
      this.toast.success(`${created.ticker} ajouté au catalogue — cours Yahoo vérifié.`);
      this.dialogRef.close(created);
    } catch (error: unknown) {
      const message = (error as { error?: { message?: string } })?.error?.message;
      this.toast.error(message ?? "Impossible d'ajouter cet ETF — vérifie l'ISIN et le ticker.");
    } finally {
      this.submitting.set(false);
    }
  }
}
