import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PositionCardComponent } from './position-card.component';

interface CardInputs {
  ticker: string;
  name: string;
  value: number;
  pnl: number | null;
  pnlPct: number | null;
  variation: number | null;
  variationPct: number | null;
  periodLabel: string;
  expanded?: boolean;
}

function render(inputs: CardInputs): ComponentFixture<PositionCardComponent> {
  const fixture = TestBed.createComponent(PositionCardComponent);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return fixture;
}

const losing: CardInputs = {
  ticker: 'ESE', name: 'BNP S&P 500 UCITS', value: 759,
  pnl: -99, pnlPct: -11.54, variation: -97, variationPct: -11.34, periodLabel: 'YTD',
};

describe('PositionCardComponent', () => {
  it('shows what identifies the position and what it is worth', () => {
    const el = render(losing).nativeElement as HTMLElement;
    expect(el.querySelector('.ticker')?.textContent?.trim()).toBe('ESE');
    expect(el.querySelector('.name')?.textContent?.trim()).toBe('BNP S&P 500 UCITS');
    expect(el.querySelector('.value')?.textContent?.trim()).toMatch(/^759\s?€$/);
  });

  it('puts the gain since purchase and the variation of the period side by side, each with its own label', () => {
    const el = render(losing).nativeElement as HTMLElement;
    const blocks = Array.from(el.querySelectorAll('.metric'));
    expect(blocks.map(b => b.querySelector('.metric-label')?.textContent?.trim())).toEqual(['PV latente', 'Var. YTD']);
    expect(blocks[0].querySelector('.amount')?.textContent?.trim()).toMatch(/^-99\s?€$/);
    expect(blocks[1].querySelector('.amount')?.textContent?.trim()).toMatch(/^-97\s?€$/);
    expect(blocks[1].querySelector('.delta.down')?.textContent?.trim()).toBe('-11,34%');
  });

  it('shows dashes, never a misleading zero, when the period variation cannot be measured', () => {
    const el = render({ ...losing, variation: null, variationPct: null }).nativeElement as HTMLElement;
    const period = el.querySelectorAll('.metric')[1];
    expect(period.querySelector('.amount')?.textContent?.trim()).toBe('—');
    expect(period.querySelector('.delta.flat')?.textContent?.trim()).toBe('—');
  });

  it('is one control that reports its open state and asks to be toggled', () => {
    const fixture = render({ ...losing, expanded: true });
    const control = (fixture.nativeElement as HTMLElement).querySelector('button.card-button') as HTMLButtonElement;
    expect(control.getAttribute('aria-expanded')).toBe('true');

    let toggles = 0;
    fixture.componentInstance.toggled.subscribe(() => toggles++);
    control.click();
    expect(toggles).toBe(1);
  });
});
