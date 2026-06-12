import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { EnvelopeService, EtfService, TransactionService } from '@patrimo/data-access';
import { AppIconComponent, AppIconName } from '../icons/app-icon.component';
import { KbdComponent } from '../kbd/kbd.component';

interface SearchResult {
  kind: 'etf' | 'env' | 'tx';
  key: string;
  primary: string;
  secondary: string;
  badge: string;
  route: string;
}

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [FormsModule, AppIconComponent, KbdComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-dialog.component.html',
})
export class SearchDialogComponent implements OnInit {
  @ViewChild('queryInput') private readonly inputRef!: ElementRef<HTMLInputElement>;

  private readonly dialogRef  = inject(MatDialogRef<SearchDialogComponent>);
  private readonly router     = inject(Router);
  private readonly etfService     = inject(EtfService);
  private readonly envelopeService     = inject(EnvelopeService);
  private readonly transactionService      = inject(TransactionService);

  protected readonly query      = signal('');
  protected readonly activeIdx  = signal(0);

  protected readonly results = computed<SearchResult[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];

    const etfResults: SearchResult[] = this.etfService.all()
      .filter(e =>
        e.ticker.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.isin.toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map(e => ({
        kind: 'etf',
        key: e.isin,
        primary: e.ticker,
        secondary: e.name,
        badge: e.alloc ?? 'ETF',
        route: '/portfolio',
      }));

    const envResults: SearchResult[] = this.envelopeService.all()
      .filter(e =>
        e.label.toLowerCase().includes(q) ||
        e.glyph.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q),
      )
      .slice(0, 3)
      .map(e => ({
        kind: 'env',
        key: e.id,
        primary: e.label,
        secondary: e.glyph.toUpperCase(),
        badge: 'Enveloppe',
        route: '/wealth',
      }));

    const txResults: SearchResult[] = this.transactionService.all()
      .filter(t =>
        (t.etf && t.etf.toLowerCase().includes(q)) ||
        t.type.toLowerCase().includes(q) ||
        t.date.includes(q),
      )
      .slice(0, 3)
      .map(t => ({
        kind: 'tx',
        key: t.id,
        primary: t.etf ? `${t.etf} · ${t.type}` : t.type,
        secondary: `${t.date} · ${t.amount.toFixed(2)} €`,
        badge: 'Transaction',
        route: '/transactions',
      }));

    return [...etfResults, ...envResults, ...txResults];
  });

  ngOnInit(): void {
    setTimeout(() => this.inputRef?.nativeElement.focus(), 50);
  }

  protected onKeydown(e: KeyboardEvent): void {
    const len = this.results().length;
    if (len === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIdx.update(i => (i + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIdx.update(i => (i - 1 + len) % len);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.navigate(this.results()[this.activeIdx()]);
    }
  }

  protected navigate(result: SearchResult): void {
    this.router.navigate([result.route]);
    this.dialogRef.close();
  }

  protected onQueryChange(): void {
    this.activeIdx.set(0);
  }

  protected kindIcon(kind: SearchResult['kind']): AppIconName {
    return kind === 'etf' ? 'portfolio' : kind === 'env' ? 'dashboard' : 'tx';
  }

  protected close(): void {
    this.dialogRef.close();
  }
}
