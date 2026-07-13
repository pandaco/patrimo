import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Coquille à onglets regroupant les trois lectures analytiques du patrimoine
 * (Indicateurs, Cash-flow, Projection) — une seule entrée sidebar au lieu de
 * trois, chaque onglet reste deep-linkable via les routes enfants.
 */
@Component({
  selector: 'app-analyses',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './analyses.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysesComponent {}
