import { Test } from '@nestjs/testing';
import { PriceCacheService, Quote } from './price-cache.service';
import { PriceService } from './price.service';
import { YahooPriceProvider } from './yahoo-price.provider';

describe('PriceService', () => {
  let service:  PriceService;
  let cache:    { get: jest.Mock; set: jest.Mock; getQuote: jest.Mock; setQuote: jest.Mock; invalidate: jest.Mock; getHistory: jest.Mock; setHistory: jest.Mock };
  let provider: { fetch: jest.Mock; fetchMetadata: jest.Mock; fetchHistorical: jest.Mock };

  beforeEach(async () => {
    cache    = { get: jest.fn(), set: jest.fn(), getQuote: jest.fn(), setQuote: jest.fn(), invalidate: jest.fn(), getHistory: jest.fn(), setHistory: jest.fn() };
    provider = { fetch: jest.fn(), fetchMetadata: jest.fn(), fetchHistorical: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        PriceService,
        { provide: PriceCacheService,  useValue: cache    },
        { provide: YahooPriceProvider, useValue: provider },
      ],
    }).compile();

    service = mod.get(PriceService);
  });

  it('returns the cached quote and does not touch Yahoo on a hit', async () => {
    const cached: Quote = { price: 42, prevClose: 41 };
    cache.getQuote.mockResolvedValue(cached);

    const result = await service.getQuote('ISIN-ESE', 'ESE');

    expect(result).toBe(cached);
    expect(provider.fetch).not.toHaveBeenCalled();
    expect(cache.setQuote).not.toHaveBeenCalled();
  });

  it('fetches from Yahoo and writes through to the cache on a miss', async () => {
    cache.getQuote.mockResolvedValue(null);
    const fresh: Quote = { price: 50, prevClose: 49 };
    provider.fetch.mockResolvedValue(fresh);

    const result = await service.getQuote('ISIN-ESE', 'ESE');

    expect(result).toEqual(fresh);
    expect(provider.fetch).toHaveBeenCalledWith('ESE.PA');
    expect(cache.setQuote).toHaveBeenCalledWith('ESE.PA', fresh);
  });

  it('falls back to the last historical close when the live quote has no price', async () => {
    cache.getQuote.mockResolvedValue(null);
    provider.fetch.mockResolvedValue({ price: null, prevClose: null }); // Yahoo unreachable
    cache.getHistory.mockResolvedValue([
      { date: '2026-06-15', close: 38 },
      { date: '2026-06-16', close: 40 },
    ]);

    const result = await service.getQuote('ISIN-ESE', 'ESE');

    // Uses the latest close as price and the prior close as prevClose, so the
    // position keeps a non-zero value (no fake +0 plus-value latente).
    expect(result).toEqual({ price: 40, prevClose: 38 });
    expect(provider.fetchHistorical).not.toHaveBeenCalled(); // served from history cache
  });

  it('refreshQuote always bypasses the cache and writes the new value through', async () => {
    const fresh: Quote = { price: 100, prevClose: 99 };
    provider.fetch.mockResolvedValue(fresh);

    const result = await service.refreshQuote('ISIN-ESE', 'ESE');

    expect(result).toEqual(fresh);
    expect(cache.getQuote).not.toHaveBeenCalled();
    expect(provider.fetch).toHaveBeenCalledWith('ESE.PA');
    expect(cache.setQuote).toHaveBeenCalledWith('ESE.PA', fresh);
  });
});
