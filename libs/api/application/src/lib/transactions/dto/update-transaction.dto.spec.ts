import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateTransactionDtoBody } from './update-transaction.dto';

function payload(overrides: Partial<UpdateTransactionDtoBody>) {
  return plainToInstance(UpdateTransactionDtoBody, { ...overrides });
}

describe('UpdateTransactionDtoBody', () => {
  it.each(['BUY', 'SELL'] as const)('rejects retyping to %s with no etfIsin in the same patch', async type => {
    const errors = await validate(payload({ type }));
    expect(errors.some(e => e.property === 'etfIsin')).toBe(true);
  });

  it.each(['BUY', 'SELL'] as const)('accepts retyping to %s alongside an etfIsin', async type => {
    const errors = await validate(payload({ type, etfIsin: 'IE00B4L5Y983' }));
    expect(errors).toHaveLength(0);
  });

  it('allows a patch that omits type entirely, even without etfIsin', async () => {
    const errors = await validate(payload({ amount: 42 }));
    expect(errors).toHaveLength(0);
  });
});
