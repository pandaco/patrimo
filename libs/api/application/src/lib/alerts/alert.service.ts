import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  AlertRuleRepository,
  EnvelopeRepository,
  EtfRepository,
  TransactionRepository,
  UserPreferencesRepository,
} from '@patrimo/api-domain';
import { ALERT_RULE_REPOSITORY } from '@patrimo/api-domain';
import { AlertDto, AlertSeverity, AlertType } from '@patrimo/contracts';
import { AlertReadOrmEntity, ENVELOPE_REPOSITORY, ETF_REPOSITORY, TRANSACTION_REPOSITORY, USER_PREFERENCES_REPOSITORY } from '@patrimo/infrastructure';
import { Repository } from 'typeorm';
import { PortfolioService } from '../portfolio/portfolio.service';

const MS_PER_DAY     = 24 * 60 * 60 * 1000;
const NBSP_RE = new RegExp('[\\u00A0\\u202F]', 'g');

function daysSince(date: Date, ref = new Date()): number {
  return Math.floor((ref.getTime() - date.getTime()) / MS_PER_DAY);
}

function humanDate(days: number): string {
  if (days < 0) return `dans ${Math.abs(days)} j`;
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
    .format(n)
    .replace(NBSP_RE, ' ');
}

@Injectable()
export class AlertService {
  constructor(
    @Inject(ENVELOPE_REPOSITORY)           private readonly envelopeRepository:   EnvelopeRepository,
    @Inject(TRANSACTION_REPOSITORY)        private readonly transactionRepository:    TransactionRepository,
    @Inject(ETF_REPOSITORY)                private readonly etfRepository:   EtfRepository,
    @Inject(ALERT_RULE_REPOSITORY)         private readonly alertRuleRepository:  AlertRuleRepository,
    @Inject(USER_PREFERENCES_REPOSITORY)   private readonly preferencesRepository: UserPreferencesRepository,
    private readonly portfolio: PortfolioService,
    @InjectRepository(AlertReadOrmEntity)
    private readonly alertReadRepository: Repository<AlertReadOrmEntity>,
  ) {}

  async listForUser(userId: string): Promise<AlertDto[]> {
    const [envelopes, txs, etfs, positions, readRows, rules, userPreferences] = await Promise.all([
      this.envelopeRepository.findByUserId(userId),
      this.transactionRepository.findByUserId(userId),
      this.etfRepository.findAll(),
      this.portfolio.listForUser(userId),
      this.alertReadRepository.findBy({ userId }),
      this.alertRuleRepository.findByUserId(userId),
      this.preferencesRepository.findByUserId(userId),
    ]);

    const ruleMap = new Map(rules.filter(r => r.enabled).map(r => [r.type, r.threshold]));
    const readMap = new Map(readRows.map(r => [r.alertHash, r]));

    const alerts: AlertDto[] = [];
    const now = new Date();

    // 1. CASH_IDLE
    const cashIdleMin = ruleMap.get('CASH_IDLE') ?? 100;
    const lastDepositByEnv = new Map<string, Date>();
    for (const tx of txs) {
      if (tx.type !== 'DEPOSIT') continue;
      const existing = lastDepositByEnv.get(tx.envelopeId);
      if (!existing || tx.date > existing) lastDepositByEnv.set(tx.envelopeId, tx.date);
    }

    for (const env of envelopes) {
      if (env.cash < cashIdleMin) continue;
      const lastDeposit = lastDepositByEnv.get(env.id);
      const days = lastDeposit ? daysSince(lastDeposit, now) : Number.POSITIVE_INFINITY;
      if (days < 30) continue; // fixed 30 days window for now
      alerts.push(buildAlert(
        `cash_idle:${env.id}`,
        'CASH_IDLE',
        'warn',
        `Cash dormant — ${env.code}`,
        `${fmtEur(env.cash)} disponibles depuis ${Number.isFinite(days) ? `${days} jours` : 'longtemps'} sur ${env.label}. Pense à investir pour ne pas rater le compounding.`,
        'Lancer le DCA',
        Number.isFinite(days) ? humanDate(days) : 'info',
        readMap,
      ));
    }

    // 2. PLAFOND_NEAR
    const plafondNearThreshold = ruleMap.get('PLAFOND_NEAR') ?? 0.8;
    for (const env of envelopes) {
      if (!env.plafond) continue;
      const ratio = env.value / env.plafond;
      if (ratio < plafondNearThreshold) continue;
      const remaining = env.plafond - env.value;
      alerts.push(buildAlert(
        `plafond:${env.id}`,
        'PLAFOND_NEAR',
        ratio >= 0.95 ? 'warn' : 'info',
        `Plafond ${env.code} proche`,
        `${Math.round(ratio * 100)} % du plafond atteints. Reste ${fmtEur(Math.max(0, remaining))} avant blocage des versements.`,
        "Voir l'enveloppe",
        'info',
        readMap,
      ));
    }

    // 3. DIVIDEND_RECENT
    const recentDivDays = ruleMap.get('DIVIDEND_RECENT') ?? 7;
    const recentDivs = txs.filter(t => t.type === 'DIVIDEND' && daysSince(t.date, now) <= recentDivDays);
    for (const div of recentDivs) {
      const env = envelopes.find(e => e.id === div.envelopeId);
      const etf = div.etfIsin ? etfs.find(e => e.isin === div.etfIsin) : undefined;
      const ticker = etf?.ticker ?? '—';
      alerts.push(buildAlert(
        `div:${div.id}`,
        'DIVIDEND_RECENT',
        'gain',
        `Dividende reçu — ${ticker}`,
        `+${fmtEur(div.amount)} crédités sur ${env?.code ?? 'ton compte'}. Pense à réinvestir pour conserver l'effet boule de neige.`,
        'Réinvestir',
        humanDate(daysSince(div.date, now)),
        readMap,
      ));
    }

    // 4. PEA_AGE_NEAR (Fixed 5 years milestone, enabled by default unless rule is explicitly disabled)
    if (ruleMap.has('PEA_AGE_NEAR') || !rules.some(r => r.type === 'PEA_AGE_NEAR')) {
      for (const env of envelopes) {
        if (env.code !== 'PEA' && env.code !== 'PEA-PME') continue;
        const fiveYears = new Date(env.openedAt);
        fiveYears.setFullYear(fiveYears.getFullYear() + 5);
        const days = Math.round((fiveYears.getTime() - now.getTime()) / MS_PER_DAY);
        if (Math.abs(days) > 90) continue;
        const passed = days <= 0;
        alerts.push(buildAlert(
          `pea_age:${env.id}`,
          'PEA_AGE_NEAR',
          'info',
          passed ? `${env.code} a passé 5 ans` : `${env.code} atteint 5 ans dans ${days} j`,
          passed
            ? `Au ${fiveYears.toISOString().slice(0, 10)}, les retraits ne ferment plus le plan.`
            : `Au ${fiveYears.toISOString().slice(0, 10)}, retraits possibles sans clôturer le plan.`,
          'En savoir plus',
          passed ? humanDate(Math.abs(days)) : humanDate(days),
          readMap,
        ));
      }
    }

    // 5. USD_CONCENTRATION
    const usdConcThreshold = ruleMap.get('USD_CONCENTRATION') ?? 0.7;
    if (positions.length > 0) {
      const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
      const usdValue = positions.reduce((a, p) => {
        const etf = etfByIsin.get(p.etfIsin);
        const price = p.currentPrice ?? p.avgPrice;
        return etf?.currency === 'USD' ? a + p.qty * price : a;
      }, 0);
      const totalValue = positions.reduce((a, p) => a + p.qty * (p.currentPrice ?? p.avgPrice), 0);
      const ratio = totalValue ? usdValue / totalValue : 0;
      if (ratio > usdConcThreshold) {
        alerts.push(buildAlert(
          'usd_conc',
          'USD_CONCENTRATION',
          'warn',
          'Exposition USD élevée',
          `${Math.round(ratio * 100)} % de tes positions sont libellées en USD. Au-delà de ${Math.round(usdConcThreshold * 100)} %, diversifie géographiquement / par devise.`,
          'Voir la répartition',
          'info',
          readMap,
        ));
      }
    }

    // 6. DCA_PENDING: monthly target set but no BUY this calendar month
    const monthlyTarget = userPreferences?.monthlyTarget ?? 0;
    if (monthlyTarget > 0) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const hasBuyThisMonth = txs.some(t => t.type === 'BUY' && t.date >= monthStart);
      if (!hasBuyThisMonth) {
        const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        alerts.push(buildAlert(
          `dca_pending:${now.getFullYear()}-${now.getMonth()}`,
          'DCA_PENDING',
          'warn',
          'Versement DCA en attente',
          `Objectif de ${fmtEur(monthlyTarget)}/mois configuré, mais aucun achat passé en ${monthLabel}. Pense à investir pour ne pas perdre une mensualité.`,
          'Passer un ordre',
          'ce mois-ci',
          readMap,
        ));
      }
    }

    // 7. ALLOCATION_DRIFT: strategic stocks/bonds target vs reality. Active by
    // default (like PEA_AGE_NEAR) unless the user explicitly disabled the rule.
    if (ruleMap.has('ALLOCATION_DRIFT') || !rules.some(r => r.type === 'ALLOCATION_DRIFT')) {
      const driftThreshold = ruleMap.get('ALLOCATION_DRIFT') ?? 5; // points
      const strategic = userPreferences?.allocationTargets?.strategic;
      if (strategic && strategic.stocks + strategic.bonds > 0 && positions.length > 0) {
        const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
        let totalValue = 0;
        let bondsValue = 0;
        for (const p of positions) {
          const value = p.qty * (p.currentPrice ?? p.avgPrice);
          totalValue += value;
          // Same approximation as the Indicateurs page: no per-ETF
          // stocks/bonds split exists, the `alloc` tag stands in.
          if (etfByIsin.get(p.etfIsin)?.alloc === 'Obligations') bondsValue += value;
        }
        if (totalValue > 0) {
          const realStocksPct = ((totalValue - bondsValue) / totalValue) * 100;
          const drift = Math.abs(realStocksPct - strategic.stocks);
          if (drift >= driftThreshold) {
            alerts.push(buildAlert(
              'allocation_drift',
              'ALLOCATION_DRIFT',
              drift >= 10 ? 'warn' : 'info',
              'Allocation éloignée de ta cible',
              `Ta poche Actions estimation à ${Math.round(realStocksPct)} % pour une cible de ${Math.round(strategic.stocks)} %, soit ${Math.round(drift)} pts d'écart. Rééquilibre en orientant tes prochains versements plutôt qu'en vendant (zéro frais, zéro fiscalité).`,
              'Voir le plan de rééquilibrage',
              'info',
              readMap,
            ));
          }
        }
      }
    }

    const order: Record<AlertSeverity, number> = { warn: 0, gain: 1, info: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);
    return alerts;
  }

  async markRead(userId: string, alertHash: string): Promise<void> {
    await this.alertReadRepository.upsert(
      { userId, alertHash, readAt: new Date() },
      { conflictPaths: ['userId', 'alertHash'], skipUpdateIfNoValuesChanged: false },
    );
  }

  async dismiss(userId: string, alertHash: string): Promise<void> {
    await this.alertReadRepository.upsert(
      { userId, alertHash, readAt: new Date(), dismissedAt: new Date() },
      { conflictPaths: ['userId', 'alertHash'], skipUpdateIfNoValuesChanged: false },
    );
  }

  async readAll(userId: string): Promise<void> {
    const alerts = await this.listForUser(userId);
    if (alerts.length === 0) return;
    const now = new Date();
    await this.alertReadRepository.upsert(
      alerts.map(a => ({ userId, alertHash: a.id, readAt: now })),
      { conflictPaths: ['userId', 'alertHash'], skipUpdateIfNoValuesChanged: false },
    );
  }
}

function buildAlert(
  id: string,
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  body: string,
  cta: string,
  date: string,
  readMap: Map<string, AlertReadOrmEntity>,
): AlertDto {
  const row = readMap.get(id);
  return {
    id, type, severity, title, body, cta, date,
    read: row?.readAt != null,
    dismissed: row?.dismissedAt != null,
  };
}
