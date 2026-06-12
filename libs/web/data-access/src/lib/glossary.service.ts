import { Injectable, signal } from '@angular/core';
import { GlossaryEntry } from './models';
import { MOCK_GLOSSARY } from './mock-data';

@Injectable({ providedIn: 'root' })
export class GlossaryService {
  readonly all = signal<GlossaryEntry[]>(MOCK_GLOSSARY);

  /** Case-insensitive lookup by canonical term key (e.g. "PRU", "Drift"). */
  find(term: string): GlossaryEntry | undefined {
    const needle = term.trim().toLowerCase();
    return this.all().find((e) => e.term.toLowerCase() === needle);
  }
}
