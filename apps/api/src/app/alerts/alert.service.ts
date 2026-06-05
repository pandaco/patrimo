import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  EnvelopeRepository,
  EtfRepository,
  TransactionRepository,
} from 'api-domain';
import { AlertDto, AlertSeverity, AlertType } from 'contracts';
import { AlertReadOrmEntity, ENVELOPE_REPOSITORY, ETF_REPOSITORY, TRANSACTION_REPOSITORY } from 'infrastructure';
import { Repository } from 'typeorm';
import { PortfolioService } from '../portfolio/portfolio.service';

const MS_PER_DAY     = 24 * 60 * 60 * 1000;
const CASH_IDLE_DAYS = 30;
const CASH_IDLE_MIN  = 100;
const PLAFOND_NEAR   = 0.8;
const RECENT_DIV_DAYS = 7;
const PEA_AGE_WINDOW_DAYS = 90;
const USD_CONC_THRESHOLD  = 0.7;
// NBSP (U+00A0) and narrow-NBSP (U+202F) are the FR-locale separators Intl
// emits; collapse both to a regular space so the output is portable across
// ICU builds. RegExp is built from escape sequences to keep the source ASCII
// clean (the `no-irregular-whitespace` ESLint rule was otherwise triggered).
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
    @Inject(ENVELOPE_REPOSITORY)    private readonly envRepo: EnvelopeRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo:  TransactionRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfRepo: EtfRepository,
    private readonly portfolio: PortfolioService,
    @InjectRepository(AlertReadOrmEntity)
    private readonly alertReadRepo: Repository<AlertReadOrmEntity>,
  ) {}

  async listForUser(userId: string): Promise<AlertDto[]> {
    const [envelopes, txs, etfs, positions, readRows] = await Promise.all([
      this.envRepo.findByUserId(userId),
      this.txRepo.findByUserId(userId),
      this.etfRepo.findAll(),
      this.portfolio.listForUser(userId),
      this.alertReadRepo.findBy({ userId }),
    ]);

    const readMap = new Map(readRows.map(r => [r.alertHash, r]));

    const alerts: AlertDto[] = [];
    const now = new Date();

    const lastDepositByEnv = new Map<string, Date>();
    for (const tx of txs) {
      if (tx.type !== 'DEPOSIT') continue;
      const existing = lastDepositByEnv.get(tx.envelopeId);
      if (!existing || tx.date > existing) lastDepositByEnv.set(tx.envelopeId, tx.date);
    }

    for (const env of envelopes) {
      if (env.cash < CASH_IDLE_MIN) continue;
      const lastDeposit = lastDepositByEnv.get(env.id);
      const days = lastDeposit ? daysSince(lastDeposit, now) : Number.POSITIVE_INFINITY;
      if (days < CASH_IDLE_DAYS) continue;
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

    for (const env of envelopes) {
      if (!env.plafond) continue;
      const ratio = env.value / env.plafond;
      if (ratio < PLAFOND_NEAR) continue;
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

    const recentDivs = txs.filter(t => t.type === 'DIVIDEND' && daysSince(t.date, now) <= RECENT_DIV_DAYS);
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

    for (const env of envelopes) {
      if (env.code !== 'PEA' && env.code !== 'PEA-PME') continue;
      const fiveYears = new Date(env.openedAt);
      fiveYears.setFullYear(fiveYears.getFullYear() + 5);
      const days = Math.round((fiveYears.getTime() - now.getTime()) / MS_PER_DAY);
      if (Math.abs(days) > PEA_AGE_WINDOW_DAYS) continue;
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

    if (positions.length > 0) {
      const etfByIsin = new Map(etfs.map(e => [e.isin, e]));
      const usdValue = positions.reduce((a, p) => {
        const etf = etfByIsin.get(p.etfIsin);
        const price = p.currentPrice ?? p.avgPrice;
        return etf?.currency === 'USD' ? a + p.qty * price : a;
      }, 0);
      const totalValue = positions.reduce((a, p) => a + p.qty * (p.currentPrice ?? p.avgPrice), 0);
      const ratio = totalValue ? usdValue / totalValue : 0;
      if (ratio > USD_CONC_THRESHOLD) {
        alerts.push(buildAlert(
          'usd_conc',
          'USD_CONCENTRATION',
          'warn',
          'Exposition USD élevée',
          `${Math.round(ratio * 100)} % de tes positions sont libellées en USD. Au-delà de 70 %, diversifie géographiquement / par devise.`,
          'Voir la répartition',
          'info',
          readMap,
        ));
      }
    }

    const order: Record<AlertSeverity, number> = { warn: 0, gain: 1, info: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);
    return alerts;
  }

  async markRead(userId: string, alertHash: string): Promise<void> {
    await this.alertReadRepo.upsert(
      { userId, alertHash, readAt: new Date() },
      { conflictPaths: ['userId', 'alertHash'], skipUpdateIfNoValuesChanged: false },
    );
  }

  async dismiss(userId: string, alertHash: string): Promise<void> {
    await this.alertReadRepo.upsert(
      { userId, alertHash, readAt: new Date(), dismissedAt: new Date() },
      { conflictPaths: ['userId', 'alertHash'], skipUpdateIfNoValuesChanged: false },
    );
  }

  async readAll(userId: string): Promise<void> {
    const alerts = await this.listForUser(userId);
    if (alerts.length === 0) return;
    const now = new Date();
    await this.alertReadRepo.upsert(
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
