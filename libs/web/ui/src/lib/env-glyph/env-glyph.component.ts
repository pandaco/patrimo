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
