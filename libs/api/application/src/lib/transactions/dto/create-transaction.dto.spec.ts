import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransactionDtoBody } from './create-transaction.dto';

function payload(overrides: Partial<CreateTransactionDtoBody>) {
  return plainToInstance(CreateTransactionDtoBody, {
    envelopeId: '11111111-1111-4111-8111-111111111111',
    type: 'BUY',
    date: '2026-01-01',
    quantity: 1,
    fees: 0,
    amount: 100,
    ...overrides,
  });
}

describe('CreateTransactionDtoBody', () => {
  it.each(['BUY', 'SELL'] as const)('rejects a %s with no etfIsin', async type => {
    const errors = await validate(payload({ type, etfIsin: undefined }));
    expect(errors.some(e => e.property === 'etfIsin')).toBe(true);
  });

  it.each(['BUY', 'SELL'] as const)('rejects a %s with an empty etfIsin', async type => {
    const errors = await validate(payload({ type, etfIsin: '' }));
    expect(errors.some(e => e.property === 'etfIsin')).toBe(true);
  });

  it.each(['BUY', 'SELL'] as const)('accepts a %s with an etfIsin', async type => {
    const errors = await validate(payload({ type, etfIsin: 'IE00B4L5Y983' }));
    expect(errors).toHaveLength(0);
  });

  it.each(['DEPOSIT', 'WITHDRAWAL', 'DIVIDEND', 'INTEREST'] as const)(
    'allows a %s with no etfIsin',
    async type => {
      const errors = await validate(payload({ type, etfIsin: undefined }));
      expect(errors).toHaveLength(0);
    },
  );
});
