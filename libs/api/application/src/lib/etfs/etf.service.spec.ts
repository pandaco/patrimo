import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Etf } from '@patrimo/api-domain';
import { CreateEtfDto } from '@patrimo/contracts';
import { ETF_REPOSITORY, TRANSACTION_REPOSITORY } from '@patrimo/infrastructure';
import { EtfService } from './etf.service';
import { PriceService } from '../market/price.service';

function etf(overrides: Partial<Etf>): Etf {
  return {
    isin: 'IE00B4L5Y983',
    ticker: 'IWDA',
    name: 'iShares Core MSCI World',
    issuer: 'iShares',
    index: 'MSCI World',
    ter: 0.2,
    currency: 'USD',
    repli: 'Physique',
    distrib: 'Capitalisant',
    pea: false,
    alloc: 'Core',
    watchOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const VALID_INPUT: CreateEtfDto = {
  isin: 'IE00B5BMR087',
  ticker: 'SXR8',
  name: 'iShares Core S&P 500',
  ter: 0.07,
  currency: 'USD',
  distrib: 'Capitalisant',
  pea: false,
  alloc: 'Core',
};

describe('EtfService', () => {
  let service: EtfService;
  let etfRepository: {
    findAll: jest.Mock;
    findByIsin: jest.Mock;
    upsert: jest.Mock;
    setWatchOnly: jest.Mock;
    deleteByIsin: jest.Mock;
  };
  let transactionRepository: { findByUserId: jest.Mock };
  let priceService: { getQuote: jest.Mock; searchSymbols: jest.Mock };

  beforeEach(async () => {
    etfRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findByIsin: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(seed => Promise.resolve(etf(seed))),
      setWatchOnly: jest.fn().mockResolvedValue(undefined),
      deleteByIsin: jest.fn().mockResolvedValue(undefined),
    };
    transactionRepository = { findByUserId: jest.fn().mockResolvedValue([]) };
    priceService = {
      getQuote: jest.fn().mockResolvedValue({ price: 540.2 }),
      searchSymbols: jest.fn().mockResolvedValue([]),
    };

    const mod = await Test.createTestingModule({
      providers: [
        EtfService,
        { provide: ETF_REPOSITORY, useValue: etfRepository },
        { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository },
        { provide: PriceService, useValue: priceService },
      ],
    }).compile();

    service = mod.get(EtfService);
  });

  describe('create', () => {
    it('validates the symbol against Yahoo then persists as watch-only', async () => {
      const created = await service.create(VALID_INPUT);

      expect(priceService.getQuote).toHaveBeenCalledWith('IE00B5BMR087', 'SXR8');
      expect(etfRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ isin: 'IE00B5BMR087', ticker: 'SXR8', watchOnly: true }),
      );
      expect(created.ticker).toBe('SXR8');
    });

    it('rejects a duplicate ISIN with 409 before calling Yahoo', async () => {
      etfRepository.findByIsin.mockResolvedValue(etf({ isin: 'IE00B5BMR087' }));

      await expect(service.create(VALID_INPUT)).rejects.toBeInstanceOf(ConflictException);
      expect(priceService.getQuote).not.toHaveBeenCalled();
      expect(etfRepository.upsert).not.toHaveBeenCalled();
    });

    it('rejects with 400 when Yahoo has no price for the symbol', async () => {
      priceService.getQuote.mockResolvedValue({ price: null });

      await expect(service.create(VALID_INPUT)).rejects.toBeInstanceOf(BadRequestException);
      expect(etfRepository.upsert).not.toHaveBeenCalled();
    });

    it('defaults the optional metadata fields to empty strings', async () => {
      await service.create(VALID_INPUT);
      expect(etfRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ issuer: '', index: '', repli: '' }),
      );
    });
  });

  describe('lookup', () => {
    it('rejects queries shorter than 2 characters', async () => {
      await expect(service.lookup(' a ')).rejects.toBeInstanceOf(BadRequestException);
      expect(priceService.searchSymbols).not.toHaveBeenCalled();
    });

    it('delegates the trimmed query to the price search', async () => {
      const results = [{ symbol: 'SXR8.DE', name: 'iShares Core S&P 500', exchange: 'XETRA', type: 'ETF', currency: 'EUR', price: 540 }];
      priceService.searchSymbols.mockResolvedValue(results);

      await expect(service.lookup('  SXR8 ')).resolves.toEqual(results);
      expect(priceService.searchSymbols).toHaveBeenCalledWith('SXR8');
    });
  });

  describe('delete', () => {
    it('removes an unreferenced catalog entry', async () => {
      etfRepository.findByIsin.mockResolvedValue(etf({}));

      await service.delete('user-1', 'IE00B4L5Y983');
      expect(etfRepository.deleteByIsin).toHaveBeenCalledWith('IE00B4L5Y983');
    });

    it('404s on an unknown ISIN', async () => {
      await expect(service.delete('user-1', 'XX0000000000')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses with 409 while transactions reference the ETF', async () => {
      etfRepository.findByIsin.mockResolvedValue(etf({}));
      transactionRepository.findByUserId.mockResolvedValue([
        { etfIsin: 'IE00B4L5Y983' },
      ]);

      await expect(service.delete('user-1', 'IE00B4L5Y983')).rejects.toBeInstanceOf(ConflictException);
      expect(etfRepository.deleteByIsin).not.toHaveBeenCalled();
    });
  });
});
