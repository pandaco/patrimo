import { Inject, Injectable } from '@nestjs/common';
import type {
  Envelope,
  EnvelopeRepository,
  EnvelopeSeed,
  EtfRepository,
  Transaction,
  TransactionRepository,
} from '@patrimo/api-domain';
import { CreateEnvelopeDto, EnvelopeDto, UpdateEnvelopeDto } from '@patrimo/contracts';
import { ENVELOPE_REPOSITORY, ETF_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';
import { PriceService } from '../market/price.service';

interface Holding { qty: number; buyQty: number; buyCost: number }

function toDto(envelope: Envelope, contributed = 0): EnvelopeDto {
  return {
    id: envelope.id,
    code: envelope.code,
    glyph: envelope.glyph,
    label: envelope.label,
    broker: envelope.broker,
    value: envelope.value,
    invested: envelope.invested,
    cash: envelope.cash,
    contributed,
    openedAt: envelope.openedAt.toISOString().slice(0, 10),
    plafond: envelope.plafond,
  };
}

function toPatch(input: UpdateEnvelopeDto): Partial<EnvelopeSeed> {
  const patch: Partial<EnvelopeSeed> = {};
  if (input.code     !== undefined) patch.code     = input.code;
  if (input.glyph    !== undefined) patch.glyph    = input.glyph;
  if (input.label    !== undefined) patch.label    = input.label;
  if (input.broker   !== undefined) patch.broker   = input.broker;
  if (input.openedAt !== undefined) patch.openedAt = new Date(input.openedAt);
  if (input.plafond  !== undefined) patch.plafond  = input.plafond;
  return patch;
}

@Injectable()
export class EnvelopeService {
  constructor(
    @Inject(ENVELOPE_REPOSITORY)    private readonly envelopes:    EnvelopeRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactions: TransactionRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfs:         EtfRepository,
    private readonly prices: PriceService,
  ) {}

  async listForUser(userId: string): Promise<EnvelopeDto[]> {
    const [rows, transactions, etfList] = await Promise.all([
      this.envelopes.findByUserId(userId),
      this.transactions.findByUserId(userId),
      this.etfs.findAll(),
    ]);
    const etfByIsin = new Map(etfList.map(e => [e.isin, e]));

    const txByEnvelope = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const list = txByEnvelope.get(transaction.envelopeId) ?? [];
      list.push(transaction);
      txByEnvelope.set(transaction.envelopeId, list);
    }

    // Resolve every held ISIN's price once (Redis-cached), shared across envelopes.
    const heldIsins = new Set(
      transactions.filter(t => t.etfIsin && (t.type === 'BUY' || t.type === 'SELL')).map(t => t.etfIsin as string),
    );
    const priceByIsin = new Map<string, number>();
    await Promise.all(
      Array.from(heldIsins).map(async isin => {
        const etf = etfByIsin.get(isin);
        if (!etf) return;
        try {
          const quote = await this.prices.getQuote(isin, etf.ticker);
          if (quote.price != null) priceByIsin.set(isin, quote.price);
        } catch { /* leave unpriced — falls back to PRU */ }
      }),
    );

    return rows.map(envelope => {
      const txs = txByEnvelope.get(envelope.id) ?? [];
      const contributed = txs.reduce((sum, t) => {
        if (t.type === 'DEPOSIT') return sum + t.amount;
        if (t.type === 'WITHDRAWAL') return sum - t.amount;
        return sum;
      }, 0);
      const valuation = this.valuate(txs, priceByIsin);
      // An envelope with no ETF position keeps its stored value: it may hold
      // manual / opaque assets (SCPI, gold, crypto, AV units) not modelled as
      // ETF transactions, which deriving would wrongly zero out.
      return valuation
        ? toDto({ ...envelope, value: valuation.value, invested: valuation.invested, cash: valuation.cash }, contributed)
        : toDto(envelope, contributed);
    });
  }

  /**
   * Derive an envelope's value / invested / cash from its own transactions,
   * or `null` when it never held an ETF (no BUY) so the caller keeps the
   * stored value. Cash is the double-entry balance (deposits − withdrawals
   * − buys + sells + income), floored at 0: a buy not covered by a recorded
   * deposit is assumed funded externally rather than producing a phantom
   * negative balance — the common case for users who only log their buys.
   */
  private valuate(
    transactions: Transaction[],
    priceByIsin: Map<string, number>,
  ): { value: number; invested: number; cash: number } | null {
    const holdings = new Map<string, Holding>();
    let rawCash = 0;
    let hasBuy = false;

    for (const transaction of transactions) {
      const price = transaction.price ?? 0;
      const costs = (transaction.fees ?? 0) + (transaction.taxes ?? 0);
      switch (transaction.type) {
        case 'BUY': {
          hasBuy = true;
          const gross = transaction.quantity * price + costs;
          rawCash -= gross;
          if (!transaction.etfIsin) break;
          const h = holdings.get(transaction.etfIsin) ?? { qty: 0, buyQty: 0, buyCost: 0 };
          h.qty += transaction.quantity; h.buyQty += transaction.quantity; h.buyCost += gross;
          holdings.set(transaction.etfIsin, h);
          break;
        }
        case 'SELL': {
          rawCash += transaction.quantity * price - costs;
          if (!transaction.etfIsin) break;
          const h = holdings.get(transaction.etfIsin) ?? { qty: 0, buyQty: 0, buyCost: 0 };
          h.qty -= transaction.quantity;
          holdings.set(transaction.etfIsin, h);
          break;
        }
        case 'DEPOSIT':    rawCash += transaction.amount; break;
        case 'WITHDRAWAL': rawCash -= transaction.amount; break;
        case 'DIVIDEND':
        case 'INTEREST':   rawCash += transaction.amount; break;
      }
    }

    if (!hasBuy) return null;

    let securities = 0;
    let invested = 0;
    for (const [isin, h] of holdings) {
      if (h.qty <= 0) continue;
      const avg = h.buyQty > 0 ? h.buyCost / h.buyQty : 0;
      invested   += h.qty * avg;
      securities += h.qty * (priceByIsin.get(isin) ?? avg);
    }

    const cash = Math.max(0, rawCash);
    return {
      value:    Number((securities + cash).toFixed(2)),
      invested: Number(invested.toFixed(2)),
      cash:     Number(cash.toFixed(2)),
    };
  }

  async create(userId: string, input: CreateEnvelopeDto): Promise<EnvelopeDto> {
    const created = await this.envelopes.create({
      userId,
      code: input.code,
      glyph: input.glyph,
      label: input.label,
      broker: input.broker,
      value: 0,
      invested: 0,
      cash: 0,
      openedAt: new Date(input.openedAt),
      plafond: input.plafond ?? null,
    });
    return toDto(created);
  }

  async update(id: string, userId: string, input: UpdateEnvelopeDto): Promise<EnvelopeDto | null> {
    const updated = await this.envelopes.updateForUser(id, userId, toPatch(input));
    if (!updated) return null;
    const txs = await this.transactions.findByUserId(userId);
    const contributed = txs.filter(t => t.envelopeId === id).reduce((sum, t) => {
        if (t.type === 'DEPOSIT') return sum + t.amount;
        if (t.type === 'WITHDRAWAL') return sum - t.amount;
        return sum;
    }, 0);
    return toDto(updated, contributed);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.envelopes.deleteForUser(id, userId);
  }
}
