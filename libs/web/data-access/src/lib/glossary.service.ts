import { Injectable, signal } from '@angular/core';
import { GlossaryEntry } from './models';
import { MOCK_GLOSSARY } from './mock-data';

@Injectable({ providedIn: 'root' })
export class GlossaryService {
  readonly all = signal<GlossaryEntry[]>(MOCK_GLOSSARY);
}
