import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { VariationComponent } from './variation.component';

function render(inputs: { amount: number | null; pct: number | null }): HTMLElement {
  const fixture: ComponentFixture<VariationComponent> = TestBed.createComponent(VariationComponent);
  fixture.componentRef.setInput('amount', inputs.amount);
  fixture.componentRef.setInput('pct', inputs.pct);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('VariationComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('shows a gain with a plus sign, the up arrow badge and the gain colour', () => {
    const el = render({ amount: 1234, pct: 10 });
    expect(el.querySelector('.amount')?.textContent?.trim()).toMatch(/^\+1\s?234\s?€$/);
    expect(el.querySelector('.amount')?.classList.contains('up')).toBe(true);
    expect(el.querySelector('.delta.up')?.textContent?.trim()).toBe('+10,00%');
  });

  it('shows a loss with its minus sign, the down arrow badge and the loss colour', () => {
    const el = render({ amount: -50, pct: -2.5 });
    expect(el.querySelector('.amount')?.textContent?.trim()).toMatch(/^-50\s?€$/);
    expect(el.querySelector('.amount')?.classList.contains('down')).toBe(true);
    expect(el.querySelector('.delta.down')?.textContent?.trim()).toBe('-2,50%');
  });

  it('shows a dash instead of a misleading 0 % when the percentage cannot be computed', () => {
    const el = render({ amount: 40, pct: null });
    expect(el.querySelector('.amount')?.textContent?.trim()).toMatch(/^\+40\s?€$/);
    expect(el.querySelector('.delta.flat')?.textContent?.trim()).toBe('—');
  });

  it('shows dashes on both lines when nothing is known', () => {
    const el = render({ amount: null, pct: null });
    expect(el.querySelector('.amount')?.textContent?.trim()).toBe('—');
    expect(el.querySelector('.delta.flat')?.textContent?.trim()).toBe('—');
  });
});
