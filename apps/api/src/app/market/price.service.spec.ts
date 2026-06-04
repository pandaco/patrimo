import { Test } from '@nestjs/testing';
import { PriceCacheService, Quote } from './price-cache.service';
import { PriceService } from './price.service';
import { YahooPriceProvider } from './yahoo-price.provider';

describe('PriceService', () => {
  let service:  PriceService;
  let cache:    { get: jest.Mock; set: jest.Mock; invalidate: jest.Mock };
  let provider: { fetch: jest.Mock };

  beforeEach(async () => {
    cache    = { get: jest.fn(), set: jest.fn(), invalidate: jest.fn() };
    provider = { fetch: jest.fn() };

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
    cache.get.mockResolvedValue(cached);

    const result = await service.getQuote('ISIN-ESE', 'ESE');

    expect(result).toBe(cached);
    expect(provider.fetch).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('fetches from Yahoo and writes through to the cache on a miss', async () => {
    cache.get.mockResolvedValue(null);
    const fresh: Quote = { price: 50, prevClose: 49 };
    provider.fetch.mockResolvedValue(fresh);

    const result = await service.getQuote('ISIN-ESE', 'ESE');

    expect(result).toEqual(fresh);
    expect(provider.fetch).toHaveBeenCalledWith('ESE.PA');
    expect(cache.set).toHaveBeenCalledWith('ESE.PA', fresh);
  });

  it('refreshQuote always bypasses the cache and writes the new value through', async () => {
    const fresh: Quote = { price: 100, prevClose: 99 };
    provider.fetch.mockResolvedValue(fresh);

    const result = await service.refreshQuote('ISIN-ESE', 'ESE');

    expect(result).toEqual(fresh);
    expect(cache.get).not.toHaveBeenCalled();
    expect(provider.fetch).toHaveBeenCalledWith('ESE.PA');
    expect(cache.set).toHaveBeenCalledWith('ESE.PA', fresh);
  });
});
