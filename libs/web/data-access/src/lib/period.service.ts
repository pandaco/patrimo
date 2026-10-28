import { Injectable, signal } from '@angular/core';
import { PerformancePeriod } from '@patrimo/contracts';

export interface PeriodOption {
  id: PerformancePeriod;
  /** Short French label shown on the selector tabs. */
  label: string;
  /** Sentence fragment used under a figure ("sur 1 mois"). */
  caption: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: '1D',  label: '1J',  caption: 'sur 1 jour' },
  { id: '1W',  label: '1S',  caption: 'sur 1 semaine' },
  { id: '1M',  label: '1M',  caption: 'sur 1 mois' },
  { id: '3M',  label: '3M',  caption: 'sur 3 mois' },
  { id: '6M',  label: '6M',  caption: 'sur 6 mois' },
  { id: 'YTD', label: 'YTD', caption: 'depuis le 1er janv.' },
  { id: '1Y',  label: '1A',  caption: 'sur 1 an' },
  { id: '3Y',  label: '3A',  caption: 'sur 3 ans' },
  { id: '5Y',  label: '5A',  caption: 'sur 5 ans' },
  { id: 'MAX', label: 'MAX', caption: 'depuis le début' },
];

const STORAGE_KEY    = 'patrimo:period';
const DEFAULT_PERIOD: PerformancePeriod = 'YTD';

function readStoredPeriod(): PerformancePeriod | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return PERIOD_OPTIONS.find(option => option.id === stored)?.id ?? null;
  } catch {
    return null; // storage blocked (private window, cleared site data…)
  }
}

/**
 * Single owner of the period shown on the dashboard, Patrimoine and Performance
 * pages, so a figure never disagrees between two screens. Lands on YTD and
 * remembers the user's choice per browser (a per-viewer convenience — the page
 * works unchanged when the storage is unavailable).
 */
@Injectable({ providedIn: 'root' })
export class PeriodService {
  private readonly selected = signal<PerformancePeriod>(readStoredPeriod() ?? DEFAULT_PERIOD);

  readonly period = this.selected.asReadonly();

  set(period: PerformancePeriod): void {
    this.selected.set(period);
    try {
      localStorage.setItem(STORAGE_KEY, period);
    } catch {
      // Remembering is best-effort.
    }
  }
}
