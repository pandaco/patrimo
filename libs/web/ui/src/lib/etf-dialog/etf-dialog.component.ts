import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateEtfDto, EtfAllocationDto, EtfDto, EtfLookupResultDto } from '@patrimo/contracts';
import { EtfService, ToastService } from '@patrimo/data-access';

export interface EtfDialogData {
  etf?: EtfDto;
}

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
  private readonly data       = inject<EtfDialogData>(MAT_DIALOG_DATA, { optional: true });
  private readonly etfService = inject(EtfService);
  private readonly toast      = inject(ToastService);

  protected readonly editing = !!this.data?.etf;
  private readonly editingIsin = this.data?.etf?.isin ?? null;

  protected readonly isin     = signal(this.data?.etf?.isin    ?? '');
  protected readonly ticker   = signal(this.data?.etf?.ticker  ?? '');
  protected readonly name     = signal(this.data?.etf?.name    ?? '');
  protected readonly ter      = signal<number | null>(this.data?.etf?.ter ?? null);
  protected readonly currency = signal(this.data?.etf?.currency ?? 'EUR');
  protected readonly distrib  = signal<'Capitalisant' | 'Distribuant'>(
    (this.data?.etf?.distrib as 'Capitalisant' | 'Distribuant') ?? 'Capitalisant',
  );
  protected readonly repli    = signal<'' | 'Physique' | 'Synthétique'>(
    (this.data?.etf?.repli as '' | 'Physique' | 'Synthétique') ?? '',
  );
  protected readonly issuer   = signal(this.data?.etf?.issuer ?? '');
  protected readonly index    = signal(this.data?.etf?.index  ?? '');
  protected readonly pea      = signal(this.data?.etf?.pea    ?? false);
  protected readonly alloc    = signal<EtfAllocationDto>(this.data?.etf?.alloc ?? 'Core');

  protected readonly submitting = signal(false);

  // ─── Yahoo search — disabled in edit mode (ISIN is locked) ───────────────

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

  protected async pick(result: EtfLookupResultDto): Promise<void> {
    this.ticker.set(result.symbol);
    this.name.set(result.name);
    if (result.currency) this.currency.set(result.currency);
    if (result.ter !== null) this.ter.set(result.ter);
    const query = this.searchQuery().trim().toUpperCase();
    if (ISIN_PATTERN.test(query)) {
      this.isin.set(query);
      try {
        const meta = await this.etfService.metadata(query);
        if (meta.ter !== null) this.ter.set(meta.ter);
        if (meta.repli) this.repli.set(meta.repli as any);
        if (meta.distrib) this.distrib.set(meta.distrib as any);
        if (meta.issuer) this.issuer.set(meta.issuer);
      } catch (e) {
        // Ignore metadata fetch errors
      }
    }
    this.searchResults.set([]);
    this.searched.set(false);
  }

  protected readonly isinValid = computed(() => ISIN_PATTERN.test(this.isin().trim().toUpperCase()));
  protected readonly canSave = computed(() => {
    const ter = this.ter();
    return (this.editing || this.isinValid())
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

    try {
      if (this.editing && this.editingIsin) {
        const payload: Partial<CreateEtfDto> = {
          ticker:  this.ticker().trim().toUpperCase(),
          name:    this.name().trim(),
          ter:     this.ter() as number,
          currency: this.currency(),
          distrib: this.distrib(),
          pea:     this.pea(),
          alloc:   this.alloc(),
          ...(this.repli()         ? { repli:  this.repli() }          : {}),
          ...(this.issuer().trim() ? { issuer: this.issuer().trim() }  : {}),
          ...(this.index().trim()  ? { index:  this.index().trim() }   : {}),
        };
        const updated = await this.etfService.update(this.editingIsin, payload);
        this.toast.success(`${updated.ticker} mis à jour.`);
        this.dialogRef.close(updated);
      } else {
        const input: CreateEtfDto = {
          isin:    this.isin().trim().toUpperCase(),
          ticker:  this.ticker().trim().toUpperCase(),
          name:    this.name().trim(),
          ter:     this.ter() as number,
          currency: this.currency(),
          distrib: this.distrib(),
          pea:     this.pea(),
          alloc:   this.alloc(),
          ...(this.repli()         ? { repli:  this.repli() }          : {}),
          ...(this.issuer().trim() ? { issuer: this.issuer().trim() }  : {}),
          ...(this.index().trim()  ? { index:  this.index().trim() }   : {}),
        };
        const created = await this.etfService.create(input);
        this.toast.success(`${created.ticker} ajouté au catalogue — il apparaîtra dans ton portefeuille après ton premier achat.`);
        this.dialogRef.close(created);
      }
    } catch (error: unknown) {
      const message = (error as { error?: { message?: string } })?.error?.message;
      this.toast.error(message ?? (this.editing ? 'Impossible de modifier cet instrument.' : "Impossible d'ajouter cet instrument — vérifie l'ISIN et le ticker."));
    } finally {
      this.submitting.set(false);
    }
  }
}
