import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AppIconName =
  | 'dashboard' | 'wealth' | 'portfolio' | 'transaction' | 'alloc' | 'perf'
  | 'dca' | 'calendar' | 'compare' | 'alert' | 'glossary' | 'settings'
  | 'search' | 'plus' | 'bell' | 'chevron' | 'upload' | 'liability' | 'cashflow' | 'projection' | 'report' | 'tips' | 'analyses';

const PATHS: Record<AppIconName, string> = {
  dashboard: 'M2 8 L8 3 L14 8 M3.5 7 V13.5 H6.5 V10 H9.5 V13.5 H12.5 V7',
  wealth:    'M2.5 13.5 V5.5 L8 2.5 L13.5 5.5 V13.5 M5.5 13.5 V8.5 H10.5 V13.5',
  portfolio: 'M2.5 4 H13.5 V12.5 H2.5 Z M2.5 7 H13.5 M5.5 10 H8 M5.5 12 H8',
  transaction:        'M3 5 H13 M3 5 L5.5 2.5 M13 11 H3 M13 11 L10.5 13.5',
  alloc:     'M8 2.5 A5.5 5.5 0 1 0 13.5 8 M8 2.5 V8 H13.5 A5.5 5.5 0 0 0 8 2.5 Z',
  perf:      'M2.5 12 L6 8 L9 10 L13.5 4 M9.5 4 H13.5 V8',
  dca:       'M8 2.5 V11.5 M8 11.5 L5 8.5 M8 11.5 L11 8.5 M3 13.5 H13',
  calendar:  'M3 4 H13 V13 H3 Z M3 7 H13 M5.5 2.5 V5 M10.5 2.5 V5 M5.5 9.5 H6.5 M9.5 9.5 H10.5',
  compare:   'M3.5 13 V3 H6.5 V13 Z M9.5 13 V6 H12.5 V13 Z',
  alert:     'M8 2.5 L14 12.5 H2 Z M8 6.5 V9 M8 11 V11.2',
  glossary:  'M3.5 2.5 H11.5 A1 1 0 0 1 12.5 3.5 V13.5 L8 11 L3.5 13.5 Z M6 5.5 H10 M6 8 H10',
  settings:  'M8 5.5 A2.5 2.5 0 1 0 8 10.5 A2.5 2.5 0 0 0 8 5.5 Z M8 1.5 V3 M8 13 V14.5 M14.5 8 H13 M3 8 H1.5 M12.6 3.4 L11.6 4.4 M4.4 11.6 L3.4 12.6 M12.6 12.6 L11.6 11.6 M4.4 4.4 L3.4 3.4',
  search:    'M7 3 A4 4 0 1 0 7 11 A4 4 0 0 0 7 3 Z M10 10 L13 13',
  plus:      'M8 3 V13 M3 8 H13',
  bell:      'M4 11 H12 V10 L11 9 V6.5 A3 3 0 0 0 5 6.5 V9 L4 10 Z M6.5 11.5 A1.5 1.5 0 0 0 9.5 11.5',
  chevron:   'M6 4 L10 8 L6 12',
  upload:    'M8 2.5 V10 M8 2.5 L5 5.5 M8 2.5 L11 5.5 M3 13 H13',
  liability: 'M8 2.5 A5.5 5.5 0 1 0 13.5 8 A5.5 5.5 0 0 0 8 2.5 Z M5.5 8 H10.5',
  cashflow:  'M2.5 6 H9 M9 6 L6.5 3.5 M9 6 L6.5 8.5 M13.5 10 H7 M7 10 L9.5 7.5 M7 10 L9.5 12.5',
  projection: 'M2.5 12.5 L6 8.5 L9 10.5 L13.5 4 M2.5 12.5 H13.5 M9.5 12.5 V10.5 M6 12.5 V8.5',
  report:    'M4 2.5 H10 L12.5 5 V13.5 H4 Z M10 2.5 V5 H12.5 M6 8 H10.5 M6 10.5 H10.5',
  tips:      'M8 2.5 A3.5 3.5 0 0 0 4.5 6 C4.5 8 6 9 6 10.5 H10 C10 9 11.5 8 11.5 6 A3.5 3.5 0 0 0 8 2.5 Z M7 12.5 H9 M7.5 14 H8.5',
  analyses:  'M3 13.5 V7 H6 V13.5 Z M6.5 13.5 V3 H9.5 V13.5 Z M10 13.5 V9 H13 V13.5 Z',
};

@Component({
  selector: 'app-ico',
  standalone: true,
  template: `
    <svg
      width="1em" height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
  host: { style: 'display:inline-flex;align-items:center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  name = input.required<AppIconName>();
  protected path = () => PATHS[this.name()];
}
