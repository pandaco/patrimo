import { Inject, Injectable } from '@nestjs/common';
import type { EtfRepository, EnvelopeRepository, Transaction, TransactionRepository, TransactionSeed, TxType } from '@patrimo/api-domain';
import { CreateTransactionDto, TransactionDto, TxTypeDto, UpdateTransactionDto } from '@patrimo/contracts';
import { ETF_REPOSITORY, ENVELOPE_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';

function toDto(tx: Transaction): TransactionDto {
  return {
    id: tx.id,
    envelopeId: tx.envelopeId,
    etfIsin: tx.etfIsin,
    type: tx.type as TxTypeDto,
    date: tx.date.toISOString().slice(0, 10),
    quantity: tx.quantity,
    price: tx.price,
    fees: tx.fees,
    taxes: tx.taxes,
    amount: tx.amount,
  };
}

function toPatch(input: UpdateTransactionDto): Partial<TransactionSeed> {
  const patch: Partial<TransactionSeed> = {};
  if (input.envelopeId !== undefined) patch.envelopeId = input.envelopeId;
  if (input.etfIsin    !== undefined) patch.etfIsin    = input.etfIsin;
  if (input.type       !== undefined) patch.type       = input.type as TxType;
  if (input.date       !== undefined) patch.date       = new Date(input.date);
  if (input.quantity   !== undefined) patch.quantity   = input.quantity;
  if (input.price      !== undefined) patch.price      = input.price;
  if (input.fees       !== undefined) patch.fees       = input.fees;
  if (input.taxes      !== undefined) patch.taxes      = input.taxes;
  if (input.amount     !== undefined) patch.amount     = input.amount;
  return patch;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '').trim());
}

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPOSITORY) private readonly transactions: TransactionRepository,
    @Inject(ENVELOPE_REPOSITORY)    private readonly envelopes:    EnvelopeRepository,
    @Inject(ETF_REPOSITORY)         private readonly etfs:         EtfRepository,
  ) {}

  async listForUser(userId: string): Promise<TransactionDto[]> {
    const rows = await this.transactions.findByUserId(userId);
    return rows.map(toDto);
  }

  async create(userId: string, input: CreateTransactionDto): Promise<TransactionDto> {
    const created = await this.transactions.create({
      userId,
      envelopeId: input.envelopeId,
      etfIsin: input.etfIsin ?? null,
      type: input.type as TxType,
      date: new Date(input.date),
      quantity: input.quantity,
      price: input.price ?? null,
      fees: input.fees,
      taxes: input.taxes ?? 0,
      amount: input.amount,
    });
    return toDto(created);
  }

  async update(id: string, userId: string, input: UpdateTransactionDto): Promise<TransactionDto | null> {
    const updated = await this.transactions.updateForUser(id, userId, toPatch(input));
    return updated ? toDto(updated) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    return this.transactions.deleteForUser(id, userId);
  }

  async exportCsv(userId: string): Promise<string> {
    const rows = await this.transactions.findByUserId(userId);
    const header = 'Date,Type,Enveloppe ID,ISIN,Quantité,Prix (€),Frais (€),Taxes (€),Montant (€)\n';
    const lines = rows.map(tx => [
      tx.date.toISOString().slice(0, 10),
      tx.type,
      tx.envelopeId,
      tx.etfIsin ?? '',
      tx.quantity,
      tx.price ?? '',
      tx.fees,
      tx.taxes,
      tx.amount,
    ].join(','));
    return header + lines.join('\n');
  }

  async importCsv(userId: string, csv: string): Promise<{ count: number; skipped: number }> {
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    const [userEnvelopes, allEtfs] = await Promise.all([
      this.envelopes.findByUserId(userId),
      this.etfs.findAll(),
    ]);

    const envMap = new Map(userEnvelopes.map(e => [e.code, e.id]));
    const etfMap = new Map(allEtfs.map(e => [e.ticker, e.isin]));

    const positionTypes = new Set<TxType>(['BUY', 'SELL']);
    let count = 0;
    let skipped = 0;
    for (const line of lines) {
      const parsed = parseCsvLine(line);
      if (parsed.length === 0 || parsed[0].toLowerCase() === 'date') continue;

      // 9 columns since the taxes column shipped; 8-column exports from
      // older versions are still accepted (taxes default to 0).
      const [date, type, envCode, ticker, qty, price, fees, col8, col9] = parsed;
      const hasTaxes = parsed.length >= 9;
      const taxesRaw = hasTaxes ? col8 : '0';
      const amountRaw = hasTaxes ? col9 : col8;

      const envelopeId = envMap.get(envCode);
      if (!envelopeId) { skipped++; continue; }

      const etfIsin   = ticker ? etfMap.get(ticker) : null;
      const txType    = type as TxType;
      const quantity  = parseFloat(qty)      || 0;
      const fee       = parseFloat(fees)     || 0;
      const tax       = parseFloat(taxesRaw) || 0;
      const amt       = parseFloat(amountRaw) || 0;
      const parsedDate = new Date(date);

      // For BUY/SELL the qty and amount must both be strictly positive — a
      // zero-qty or zero-amount row would produce an undefined cost basis
      // when downstream FIFO math divides by qty. Other types (DEPOSIT,
      // WITHDRAWAL, DIVIDEND, INTEREST) only need a positive amount.
      const needsLot = positionTypes.has(txType);
      const invalid =
        Number.isNaN(parsedDate.getTime()) ||
        amt <= 0 ||
        (needsLot && quantity <= 0) ||
        (needsLot && !etfIsin);
      if (invalid) { skipped++; continue; }

      await this.transactions.create({
        userId,
        envelopeId,
        etfIsin: etfIsin ?? null,
        type: txType,
        date: parsedDate,
        quantity,
        price: price ? parseFloat(price) : null,
        fees: fee,
        taxes: tax,
        amount: amt,
      });
      count++;
    }

    return { count, skipped };
  }
}
