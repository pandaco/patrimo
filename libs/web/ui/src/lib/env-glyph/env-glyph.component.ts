import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface EnvGlyphData { glyph: string; code: string }

function codeToChar(code: string): string {
  switch (code) {
    case 'PEA-PME':  return 'P+';
    case 'Livret A': return '₳';
    case 'LDDS':     return 'ⓁD';
    case 'SCPI':     return 'Sc';
    case 'Or':       return 'Au';
    case 'Crypto':   return '₿';
    default:         return code.charAt(0);
  }
}

@Component({
  selector: 'ui-env-glyph',
  standalone: true,
  template: `
    <div
      [class]="'env-glyph ' + env().glyph"
      [style]="sizeStyle()"
    >{{ char() }}</div>
  `,
  styles: `
    .env-glyph {
      width: 32px; height: 32px; border-radius: 9px;
      display: grid; place-items: center;
      font-weight: 700; font-size: 12px; color: #fff;
      background: var(--ink); flex-shrink: 0; letter-spacing: -0.02em;
      &.pea    { background: #16A34A; }
      &.peapme { background: #15803D; }
      &.cto    { background: #EA580C; }
      &.av     { background: #7C3AED; }
      &.per    { background: #475569; }
      &.pee    { background: #0284C7; }
      &.livret { background: #CA8A04; }
      &.crypto { background: #18181B; }
      &.immo   { background: #DC2626; }
      &.metal  { background: #B45309; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvGlyphComponent {
  env  = input.required<EnvGlyphData>();
  size = input<number | null>(null);

  protected char      = computed(() => codeToChar(this.env().code));
  protected sizeStyle = computed(() => {
    const s = this.size();
    return s ? `width:${s}px;height:${s}px;font-size:${Math.round(s * 0.5)}px` : null;
  });
}
