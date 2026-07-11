import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  InjectionToken,
  OnDestroy,
  Renderer2,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

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

const MARGIN = 8;

@Component({
  selector: 'ui-term',
  standalone: true,
  template: `
    <span class="term-wrap"
          (mouseenter)="hover.set(true)"
          (mouseleave)="hover.set(false)">
      <button type="button"
              class="term"
              #trigger
              [attr.aria-expanded]="open()"
              [attr.aria-label]="'Définition de ' + term()"
              (click)="pinned.set(!pinned())">
        <ng-content />
      </button>
    </span>
  `,
  styles: `
    :host { display: inline; }
    .term-wrap { display: inline-block; }
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermComponent implements OnDestroy {
  /** Glossary key, e.g. "PRU", "Drift", "DCA". */
  readonly term = input.required<string>();

  private readonly lookup   = inject(GLOSSARY_LOOKUP, { optional: true });
  private readonly renderer = inject(Renderer2);
  private readonly router   = inject(Router);

  protected readonly hover  = signal(false);
  protected readonly pinned = signal(false);
  protected readonly open   = computed(() => this.hover() || this.pinned());

  protected readonly def = computed(() => this.lookup?.(this.term()));

  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('trigger');
  private cardEl: HTMLElement | null = null;

  constructor() {
    // Renders the definition card as a real `position: fixed` element
    // appended to <body> — not an in-template absolutely-positioned span —
    // so an ancestor `overflow: hidden` (used for rounded card corners, e.g.
    // `.wealth-hero`) can never clip it. Same approach as `TipDirective`.
    effect(() => {
      const d = this.def();
      if (this.open() && d) this.show(d);
      else this.hide();
    });
  }

  private show(d: GlossaryTermDef): void {
    const trigger = this.triggerRef()?.nativeElement;
    if (!trigger || this.cardEl) return;

    const card = this.renderer.createElement('div') as HTMLElement;
    card.className = 'term-card-popup';
    card.setAttribute('role', 'tooltip');
    // Moving the mouse off the trigger and onto the card must not close it —
    // the card hosts a real link the user needs to reach and click.
    card.addEventListener('mouseenter', () => this.hover.set(true));
    card.addEventListener('mouseleave', () => this.hover.set(false));

    const title = this.renderer.createElement('div') as HTMLElement;
    title.className = 'term-title';
    title.textContent = d.title;
    card.appendChild(title);

    const body = this.renderer.createElement('div') as HTMLElement;
    body.className = 'term-body';
    body.textContent = d.body;
    card.appendChild(body);

    if (d.example) {
      const example = this.renderer.createElement('div') as HTMLElement;
      example.className = 'term-example';
      example.textContent = `Ex. : ${d.example}`;
      card.appendChild(example);
    }

    const link = this.renderer.createElement('a') as HTMLAnchorElement;
    link.className = 'term-link';
    link.href = '/tools/glossary';
    link.textContent = 'Voir le glossaire →';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      this.pinned.set(false);
      this.router.navigateByUrl('/tools/glossary');
    });
    card.appendChild(link);

    this.renderer.appendChild(document.body, card);
    this.cardEl = card;

    const hostRect = trigger.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    let left = hostRect.left + hostRect.width / 2 - cardRect.width / 2;
    left = Math.max(MARGIN, Math.min(window.innerWidth - cardRect.width - MARGIN, left));

    let top = hostRect.bottom + 8;
    // Not enough room below (card near the bottom of the viewport) — flip above.
    if (top + cardRect.height > window.innerHeight - MARGIN) {
      const above = hostRect.top - cardRect.height - 8;
      top = above < MARGIN ? Math.max(MARGIN, window.innerHeight - cardRect.height - MARGIN) : above;
    }

    this.renderer.setStyle(card, 'left', `${left}px`);
    this.renderer.setStyle(card, 'top', `${top}px`);
  }

  private hide(): void {
    if (!this.cardEl) return;
    this.renderer.removeChild(document.body, this.cardEl);
    this.cardEl = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.pinned.set(false);
    this.hover.set(false);
  }
}
