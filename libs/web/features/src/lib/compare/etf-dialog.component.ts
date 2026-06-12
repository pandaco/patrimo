import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateEtfDto, EtfAllocationDto, EtfDto, EtfLookupResultDto } from '@patrimo/contracts';
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

  // ─── Yahoo search — type an ISIN, ticker or name, pick a candidate ────────

  protected readonly searchQuery   = signal('');
  protected readonly searching     = signal(false);
  protected readonly searched      = signal(false);
  protected readonly searchResults = signal<EtfLookupResultDto[]>([]);

  protected async search(): Promise<void> {
    const query = this.searchQuery().trim();
    if (query.length < 2 || this.searching()) return;
    this.searching.set(true);
    try {
      this.searchResults.set(await this.etfService.lookup(query));
      this.searched.set(true);
    } catch {
      this.searchResults.set([]);
      this.searched.set(true);
    } finally {
      this.searching.set(false);
    }
  }

  /** Fill the form from a Yahoo candidate; the ISIN is kept when it was the query. */
  protected pick(result: EtfLookupResultDto): void {
    this.ticker.set(result.symbol);
    this.name.set(result.name);
    if (result.currency) this.currency.set(result.currency);
    const query = this.searchQuery().trim().toUpperCase();
    if (ISIN_PATTERN.test(query)) this.isin.set(query);
    this.searchResults.set([]);
    this.searched.set(false);
  }

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
