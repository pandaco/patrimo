import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GlossaryService } from '@patrimo/data-access';

const ENVELOPE_DEFS = [
  { code:'PEA',       desc:"Plan d'Épargne en Actions",           plaf:'150 000 €',              blocking:'5 ans',              tax:'Exo IR après 5 ans, PS 17,2 %' },
  { code:'PEA-PME',   desc:'PME / ETI européennes',               plaf:'225 000 € (cumul)',       blocking:'5 ans',              tax:'Idem PEA' },
  { code:'CTO',       desc:'Compte-Titres Ordinaire',             plaf:'Aucun',                   blocking:'Aucun',              tax:'PFU 30 %' },
  { code:'AV',        desc:'Assurance-Vie',                       plaf:'Aucun',                   blocking:'8 ans favorable',    tax:"Abattement 4 600 €/an après 8 ans" },
  { code:'PER',       desc:"Plan d'Épargne Retraite",             plaf:'Aucun (déductibilité plafonnée)', blocking:'Retraite',  tax:'Versements déductibles' },
  { code:'PEE',       desc:"Plan d'Épargne Entreprise",           plaf:'25 % rev. brut',          blocking:'5 ans',              tax:'Exo IR sur revenus' },
  { code:'Livret A',  desc:'Livret réglementé',                   plaf:'22 950 €',                blocking:'Aucun',              tax:'Exonéré' },
  { code:'LDDS',      desc:'Livret Dév. Durable & Solidaire',     plaf:'12 000 €',                blocking:'Aucun',              tax:'Exonéré' },
  { code:'LEP',       desc:"Livret d'Épargne Populaire",          plaf:'10 000 €',                blocking:'Aucun',              tax:'Exonéré · RFR plafonné' },
];

@Component({
  selector: 'app-glossary',
  standalone: true,
  imports: [],
  templateUrl: './glossary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlossaryComponent {
  private readonly svc = inject(GlossaryService);
  protected readonly entries = this.svc.all;
  protected readonly envelopes = ENVELOPE_DEFS;
}
