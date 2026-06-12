import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  InjectionToken,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

export interface GlossaryTermDef {
  term: string;
  title: string;
  body: string;
  example?: string;
}

/**
 * Lookup function resolving a glossary term to its definition.
 * Provided at the app level so this presentational component stays
 * decoupled from the data-access layer.
 */
export const GLOSSARY_LOOKUP = new InjectionToken<(term: string) => GlossaryTermDef | undefined>(
  'GLOSSARY_LOOKUP',
);

@Component({
  selector: 'ui-term',
  standalone: true,
  imports: [RouterLink],
  template: `
    <span class="term-wrap"
          (mouseenter)="hover.set(true)"
          (mouseleave)="hover.set(false)">
      <button type="button"
              class="term"
              [attr.aria-expanded]="open()"
              [attr.aria-label]="'Définition de ' + term()"
              (click)="pinned.set(!pinned())">
        <ng-content />
      </button>
      @if (open() && def(); as d) {
        <span class="term-card" role="tooltip">
          <span class="term-title">{{ d.title }}</span>
          <span class="term-body">{{ d.body }}</span>
          @if (d.example) {
            <span class="term-example">Ex. : {{ d.example }}</span>
          }
          <a class="term-link" routerLink="/tools/glossary" (click)="pinned.set(false)">
            Voir le glossaire →
          </a>
        </span>
      }
    </span>
  `,
  styles: `
    :host { display: inline; }
    .term-wrap { position: relative; display: inline-block; }
    .term {
      all: unset;
      cursor: help;
      border-bottom: 1px dotted var(--ink-3, #888);
      font: inherit;
      color: inherit;
    }
    .term:focus-visible {
      outline: 2px solid var(--brand, #4663d8);
      outline-offset: 2px;
      border-radius: 2px;
    }
    .term-card {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 280px;
      padding: 12px 14px;
      background: var(--paper, #fff);
      border: 1px solid var(--rule-soft, #ddd);
      border-radius: var(--r, 8px);
      box-shadow: var(--shadow-sm, 0 4px 16px rgba(0, 0, 0, 0.12));
      z-index: 80;
      text-align: left;
      white-space: normal;
      font-weight: 400;
      letter-spacing: 0;
    }
    .term-title { font-size: 12.5px; font-weight: 600; color: var(--ink, #111); }
    .term-body  { font-size: 12px; line-height: 1.45; color: var(--ink-2, #444); }
    .term-example {
      font-size: 11.5px;
      line-height: 1.4;
      color: var(--ink-3, #777);
      font-style: italic;
      border-left: 2px solid var(--rule, #e5e5e5);
      padding-left: 8px;
    }
    .term-link { font-size: 11.5px; color: var(--ink-3, #777); text-decoration: none; }
    .term-link:hover { color: var(--ink, #111); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermComponent {
  /** Glossary key, e.g. "PRU", "Drift", "DCA". */
  readonly term = input.required<string>();

  private readonly lookup = inject(GLOSSARY_LOOKUP, { optional: true });

  protected readonly hover  = signal(false);
  protected readonly pinned = signal(false);
  protected readonly open   = computed(() => this.hover() || this.pinned());

  protected readonly def = computed(() => this.lookup?.(this.term()));

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.pinned.set(false);
    this.hover.set(false);
  }
}
