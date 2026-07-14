import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type TipCategory =
  | 'fiscalite'
  | 'allocation'
  | 'dca'
  | 'frais'
  | 'comportement'
  | 'diversification';

interface Tip {
  id: string;
  category: TipCategory;
  title: string;
  body: string;
  /** Optional one-line punchline shown in the header. */
  takeaway?: string;
  /** Optional explicit downside / nuance. */
  caveat?: string;
}

interface CategoryDef { id: TipCategory | 'all'; label: string; icon: string }

const CATEGORIES: CategoryDef[] = [
  { id: 'all',             label: 'Tous',           icon: '⭐' },
  { id: 'fiscalite',       label: 'Fiscalité',      icon: '🏛️' },
  { id: 'allocation',      label: 'Allocation',     icon: '🥧' },
  { id: 'dca',             label: 'DCA',            icon: '📅' },
  { id: 'frais',           label: 'Frais',          icon: '💸' },
  { id: 'diversification', label: 'Diversification', icon: '🌍' },
  { id: 'comportement',    label: 'Comportement',   icon: '🧠' },
];

const TIPS: Tip[] = [
  {
    id: 'pea-5ans',
    category: 'fiscalite',
    title: 'Attends 5 ans sur ton PEA avant de retirer',
    takeaway: 'Avant 5 ans, retrait = clôture + impôt sur la plus-value. Après, exonération d\'impôt (sauf prélèvements sociaux 17,2 %).',
    body: 'Le Plan d\'Épargne en Actions accorde une exonération totale d\'impôt sur le revenu après 5 ans de détention (date d\'ouverture, pas date des versements). Avant 5 ans, le moindre retrait clôture le PEA et déclenche le PFU à 30 % sur l\'intégralité des gains. Garde le compte ouvert même en période de tension : tu peux y verser jusqu\'à 150 000 €.',
    caveat: 'Les prélèvements sociaux (17,2 %) s\'appliquent dans tous les cas, avant comme après 5 ans.',
  },
  {
    id: 'av-8ans',
    category: 'fiscalite',
    title: 'L\'assurance-vie devient intéressante à partir de 8 ans',
    takeaway: 'Abattement annuel de 4 600 € sur les plus-values (9 200 € pour un couple) après 8 ans. Couplé à la clause bénéficiaire, c\'est l\'outil de transmission le plus efficace.',
    body: 'Avant 8 ans, l\'AV est taxée comme un compte titres ordinaire (PFU 30 % par défaut). Après, tu profites d\'un abattement annuel sur les plus-values des rachats. Pour la succession, les versements avant 70 ans bénéficient d\'un abattement de 152 500 € par bénéficiaire (au-delà : 20 % puis 31,25 %). Ouvre une AV même avec 100 € pour démarrer le compteur.',
  },
  {
    id: 'ldds-lep',
    category: 'fiscalite',
    title: 'Maximise le Livret A + LDDS + LEP avant tout le reste',
    takeaway: 'Capital garanti, intérêts exonérés, liquidité immédiate. Le LEP rapporte 6 %/an (2026) si tu y as droit.',
    body: 'Avant d\'investir en bourse, sature ces enveloppes : Livret A (22 950 € à ~3 %), LDDS (12 000 € à ~3 %), LEP (10 000 € à ~6 % si RFR < seuil). C\'est ton épargne de précaution — l\'équivalent de 3 à 6 mois de dépenses, accessibles sans pénalité.',
    caveat: 'Les taux sont révisés deux fois par an. Vérifie les seuils RFR pour le LEP — ils changent chaque année.',
  },
  {
    id: 'core-satellite',
    category: 'allocation',
    title: 'Garde 70-80 % en Core, 10-25 % en Satellite max',
    takeaway: 'Le Core (MSCI World, S&P 500) est la base diversifiée qui porte la performance long terme. Le Satellite est ta poche tactique — petite et conviction.',
    body: 'Plus tu mets en Satellite, plus tu paries activement contre l\'indice global. Historiquement, 80-90 % des fonds actifs sous-performent leur benchmark sur 10 ans. Le Core te garantit la performance de marché ; le Satellite est ton expression de vue (thématique IA, marchés émergents, value, …). Si ton Satellite dépasse 30 %, demande-toi pourquoi tu n\'es pas juste un stock-picker.',
  },
  {
    id: 'rebalance-1y',
    category: 'allocation',
    title: 'Rééquilibre une fois par an, pas plus souvent',
    takeaway: 'Le rééquilibrage fréquent génère des frais et des moins-values fiscales sans gain de rendement. Une fois par an suffit largement.',
    body: 'Tant que ton drift reste sous 5 points, ne touche à rien. Au-delà, soit tu rééquilibres par versement (oriente le prochain DCA vers les lignes sous-pondérées — coût zéro), soit tu vends/achètes (PEA : zéro impact fiscal jusqu\'à la sortie ; CTO : tu réalises de la plus-value imposable). Si tu rééquilibres par DCA, c\'est tellement progressif que tu n\'as quasi jamais besoin d\'arbitrer.',
  },
  {
    id: 'dca-regulier',
    category: 'dca',
    title: 'Investir 500 €/mois bat largement attendre le "bon moment"',
    takeaway: 'Sur 30 ans de DCA mensuel sur le S&P 500, tu rates 80 % des creux de marché — mais aussi 80 % des pics. Le rendement final est statistiquement supérieur au market timing pour un investisseur amateur.',
    body: 'Le DCA fonctionne grâce à deux mécaniques : (1) tu achètes mécaniquement plus de parts quand c\'est bas et moins quand c\'est haut, ce qui lisse ton PRU ; (2) tu enlèves l\'émotion de l\'équation — pas besoin de deviner si c\'est le bon moment. Tu transformes une décision unique stressante en 360 micro-décisions automatiques.',
    caveat: 'Le DCA n\'élimine pas le risque de baisse du sous-jacent. Sur un marché en baisse longue (Japon 1990-2010), même un DCA disciplinné a souffert.',
  },
  {
    id: 'dca-correction',
    category: 'dca',
    title: 'Renforce un peu en cas de krach, pas l\'inverse',
    takeaway: 'Si le marché perd 30 %, le pire que tu puisses faire est d\'arrêter ton DCA. Idéalement, augmente-le.',
    body: 'En 2008 et 2020, ceux qui ont continué à investir mensuellement ont eu des rendements supérieurs à ceux qui ont attendu "que ça se calme". Les meilleures fenêtres d\'achat sont quand tout le monde panique. Si tu peux te permettre de doubler ton DCA pendant un -20 %, tu encaisses la reprise sur un PRU bien plus bas.',
    caveat: 'Garde toujours 3-6 mois d\'épargne de précaution. Un krach + perte d\'emploi + emprunts sur des positions baissières = catastrophe.',
  },
  {
    id: 'ter-watch',
    category: 'frais',
    title: 'Compare les TER : 0,1 % vs 0,5 %, c\'est 12 % de différence sur 30 ans',
    takeaway: 'Sur 100 000 € investis 30 ans à 7 %/an, 0,4 % de TER en plus = -12 000 € au capital final. Les frais composent comme le rendement.',
    body: 'Un TER de 0,15 % (Amundi ETF MSCI World) vs 0,55 % (un fonds actif équivalent) sur 30 ans peut représenter 15 à 20 % de capital final en différence. Les frais sont la seule chose que tu peux contrôler avec certitude — la performance future est inconnue. Privilégie les ETF Core avec TER < 0,25 %.',
  },
  {
    id: 'courtage',
    category: 'frais',
    title: 'Ne paie pas plus de 1 % de frais de courtage par ordre',
    takeaway: 'Sur un ordre de 500 €, 5 € de courtage = 1 %. C\'est déjà la performance d\'un mois.',
    body: 'Choisis un broker low-cost. Pour le PEA : Fortuneo, BoursoBank, Trade Republic sont compétitifs. Pour le CTO : Trade Republic (1 €/ordre), Saxo, DEGIRO. Évite les banques traditionnelles qui facturent 10-15 €/ordre. Si tu fais 12 DCA mensuels à 5 € = 60 €/an de frais, vs 12 € chez Trade Republic.',
    caveat: 'Vérifie aussi les frais de garde annuels (souvent 0 sur PEA, parfois 0,3-0,5 % sur CTO premium).',
  },
  {
    id: 'world-or-sp500',
    category: 'diversification',
    title: 'MSCI World > S&P 500 (mais c\'est pas grave)',
    takeaway: 'Le MSCI World est mondial (23 pays développés), le S&P 500 est US uniquement. Le S&P 500 = 70 % du MSCI World de toute façon.',
    body: 'Sur 50 ans, la performance MSCI World et S&P 500 sont quasi identiques (le S&P un peu meilleur grâce aux 30 dernières années de domination US). MSCI World te protège contre un éventuel cycle long anti-US. S&P 500 est plus volatil mais plus concentré dans la tech. Pas de mauvais choix entre les deux — pas besoin d\'en débattre 6 mois.',
  },
  {
    id: 'emergents',
    category: 'diversification',
    title: 'Pour vraiment diversifier, ajoute des marchés émergents',
    takeaway: 'MSCI World ne contient PAS la Chine, l\'Inde, le Brésil ou l\'Asie du Sud-Estimation. Pour aller vers MSCI ACWI (All Country World Index), ajoute 10-15 % d\'EM.',
    body: 'Un ETF MSCI Emerging Markets (Amundi Emerging Markets ESG, iShares EM) couvre les économies à forte croissance. Sur 20 ans la volatilité est plus haute (~22 %/an vs 15 % pour le monde développé), mais le potentiel long terme est réel. Cap typique : 10-20 % de la poche actions, pas plus, et seulement si tu acceptes le drawdown plus violent en cas de crise.',
  },
  {
    id: 'panic-sell',
    category: 'comportement',
    title: 'Le pire moment pour vendre est quand tu en as le plus envie',
    takeaway: 'Les flux de retrait des fonds actions atteignent leur maximum au creux des krachs — exactement quand il faudrait acheter.',
    body: 'En mars 2020, en octobre 2008, en mars 2003, les sorties massives ont coïncidé avec les meilleurs points d\'achat. Le cerveau humain est cablé pour la fuite face à la perte. La parade : automatise complètement (DCA mensuel programmé), évite de regarder ton compte tous les jours, et accepte que les -30 % font partie du contrat actionnaire.',
  },
  {
    id: 'fomo',
    category: 'comportement',
    title: 'Si tout le monde en parle, c\'est probablement trop tard',
    takeaway: 'Les pics de recherche Google "Bitcoin", "GameStop", "NVIDIA" coïncident avec les sommets locaux. La foule arrive en haut.',
    body: 'Quand un titre/secteur fait la une des journaux, des chaînes YouTube et des dîners de famille, la plupart du potentiel est déjà pricé. Reste sur ton plan d\'allocation, ne change pas d\'avis sur une émotion. Les meilleurs rendements long terme viennent d\'être présent quand personne n\'en parle, pas d\'arriver à la fête.',
  },
  {
    id: 'dont-touch',
    category: 'comportement',
    title: 'Le meilleur portefeuille est celui que tu oublies',
    takeaway: 'Une étude Fidelity a montré que les meilleurs comptes étaient ceux des clients décédés ou ayant oublié leur mot de passe.',
    body: 'Chaque arbitrage a un coût (frais, impôt, mauvais timing). Quand ton allocation est définie et que ton DCA est automatisé, regarde ton compte une fois par mois maximum. La performance vient du temps, pas de l\'attention. Patrimo est utile pour le bilan mensuel — pas pour la consultation quotidienne.',
  },
];

@Component({
  selector: 'app-tips',
  standalone: true,
  templateUrl: './tips.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipsComponent {
  protected readonly categories  = CATEGORIES;
  protected readonly activeCat   = signal<TipCategory | 'all'>('all');

  protected readonly tips = computed<Tip[]>(() => {
    const cat = this.activeCat();
    if (cat === 'all') return TIPS;
    return TIPS.filter(t => t.category === cat);
  });

  protected categoryLabel(id: TipCategory): string {
    return CATEGORIES.find(c => c.id === id)?.label ?? id;
  }

  protected categoryIcon(id: TipCategory): string {
    return CATEGORIES.find(c => c.id === id)?.icon ?? '⭐';
  }

  protected setCat(cat: TipCategory | 'all'): void { this.activeCat.set(cat); }
}
