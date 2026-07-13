import type { Transaction } from '@patrimo/data-access';
import { computeRealized } from '../portfolio/realized-plusValue';

/**
 * French taxation of realized capital gains, as an *estimate*.
 *
 * Key nuance the UI must respect: selling inside a PEA / PEA-PME / assurance-vie
 * / PER / PEE is **not** a taxable event — gains there are deferred until
 * withdrawal (and, on a 5-year-old PEA, exempt from income tax, leaving only
 * social levies). Only a CTO (and crypto) realizes a taxable gain in the year,
 * taxed at the flat PFU of 30 % (12.8 % income tax + 17.2 % social levies).
 *
 * Losses are not netted here — they carry forward over several years under
 * rules out of scope for a simple estimate; only positive taxable gains count.
 */

const TAXABLE_CODES = new Set(['CTO', 'Crypto']);
const PEA_CODES     = new Set(['PEA', 'PEA-PME']);
const PFU_INCOME_RATE = 0.128;
const PFU_SOCIAL_RATE = 0.172;
const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

export interface PeaStatus {
  code: string;
  openedAt: string;
  /** ISO date the plan turns 5 (income-tax-free withdrawals from then on). */
  fiveYearDate: string;
  eligible: boolean;
  monthsLeft: number;
}

export interface TaxEstimate {
  /** Positive realized gains in taxable envelopes (CTO / crypto) since `sinceDate`. */
  taxableRealizedYtd: number;
  /** Realized gains in tax-sheltered envelopes (PEA/AV/PER/PEE) — informational, deferred. */
  deferredRealizedYtd: number;
  incomeTax: number;
  socialTax: number;
  pfuTotal: number;
  peaStatuses: PeaStatus[];
}

interface EnvelopeLike { id: string; code: string; openedAt: string }

export function computeTaxEstimate(
  txs: Transaction[],
  envelopes: EnvelopeLike[],
  sinceDate: string,
  now = new Date(),
): TaxEstimate {
  // FIFO must run per envelope: the same ISIN held in two envelopes has two
  // independent lot queues.
  const byEnvelope = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const list = byEnvelope.get(tx.envelope) ?? [];
    list.push(tx);
    byEnvelope.set(tx.envelope, list);
  }

  let taxable = 0;
  let deferred = 0;
  for (const env of envelopes) {
    const group = byEnvelope.get(env.id);
    if (!group || group.length === 0) continue;
    const realized = computeRealized(group, sinceDate).realizedSince;
    if (realized === 0) continue;
    if (TAXABLE_CODES.has(env.code)) taxable += Math.max(0, realized);
    else                            deferred += realized;
  }

  const incomeTax = taxable * PFU_INCOME_RATE;
  const socialTax = taxable * PFU_SOCIAL_RATE;

  const peaStatuses: PeaStatus[] = envelopes
    .filter(e => PEA_CODES.has(e.code))
    .map(e => {
      const five = new Date(e.openedAt);
      five.setFullYear(five.getFullYear() + 5);
      const eligible = now >= five;
      return {
        code: e.code,
        openedAt: e.openedAt,
        fiveYearDate: five.toISOString().slice(0, 10),
        eligible,
        monthsLeft: eligible ? 0 : Math.max(0, Math.round((five.getTime() - now.getTime()) / MS_PER_MONTH)),
      };
    });

  const round = (x: number) => Math.round(x * 100) / 100;
  return {
    taxableRealizedYtd:  round(taxable),
    deferredRealizedYtd: round(deferred),
    incomeTax: round(incomeTax),
    socialTax: round(socialTax),
    pfuTotal:  round(incomeTax + socialTax),
    peaStatuses,
  };
}
