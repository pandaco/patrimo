import { Directive, ElementRef, HostListener, OnDestroy, Renderer2, inject } from '@angular/core';

const MARGIN = 8;

/**
 * Renders `[data-tip]`'s value as a floating tooltip on hover/focus, as a
 * real `position: fixed` element appended to `<body>` — not a CSS `::after`
 * pseudo-element, which can't be measured or repositioned from JS. Clamps
 * horizontally so the tooltip never overflows the viewport near the page's
 * edges (the pseudo-element version always centered on the trigger and got
 * silently clipped there).
 */
@Directive({
  // Reuses the existing `data-tip="..."` attribute already on ~80 elements
  // across the app (see `_misc.scss`) so no template needed a rename.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[data-tip]',
  standalone: true,
})
export class TipDirective implements OnDestroy {
  private readonly host     = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private tooltipEl: HTMLElement | null = null;

  @HostListener('mouseenter')
  @HostListener('focus')
  protected show(): void {
    const text = this.host.nativeElement.getAttribute('data-tip');
    if (!text || this.tooltipEl) return;

    const tip = this.renderer.createElement('div') as HTMLElement;
    tip.className = 'data-tip-popup';
    tip.setAttribute('role', 'tooltip');
    tip.textContent = text;
    this.renderer.appendChild(document.body, tip);
    this.tooltipEl = tip;

    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const tipRect  = tip.getBoundingClientRect();

    let left = hostRect.left + hostRect.width / 2 - tipRect.width / 2;
    left = Math.max(MARGIN, Math.min(window.innerWidth - tipRect.width - MARGIN, left));
    let top = hostRect.top - tipRect.height - 9;
    // Not enough room above (tooltip near the top of the viewport) — flip below.
    if (top < MARGIN) top = hostRect.bottom + 9;

    this.renderer.setStyle(tip, 'left', `${left}px`);
    this.renderer.setStyle(tip, 'top', `${top}px`);
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  protected hide(): void {
    if (!this.tooltipEl) return;
    this.renderer.removeChild(document.body, this.tooltipEl);
    this.tooltipEl = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
