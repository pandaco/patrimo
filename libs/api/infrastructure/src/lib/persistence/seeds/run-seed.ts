// Seed runner — populates the dev database with a fixture user, the ETF
// catalog and a realistic envelope + transaction history.
// Idempotent: re-running it is a no-op once the seed user already exists.
//
//   npm run db:seed
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../data-source-options';
import { EnvelopeOrmEntity } from '../orm-entities/envelope.orm-entity';
import { EtfOrmEntity } from '../orm-entities/etf.orm-entity';
import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';

loadEnv();

const SEED_USER = {
  googleId:  'seed-dev-user',
  email:     'dev@patrimo.local',
  name:      'Antoine Huet (seed)',
  firstName: 'Antoine',
  lastName:  'Huet',
  initials:  'AH',
  picture:   null,
};

const SEED_ETFS = [
  { isin:'FR0010315770', ticker:'ESE',   name:'Amundi S&P 500 UCITS',         issuer:'Amundi',  index:'S&P 500',            ter:0.15, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true,  alloc:'Core' as const },
  { isin:'FR0010261198', ticker:'CW8',   name:'Amundi MSCI World UCITS',      issuer:'Amundi',  index:'MSCI World',         ter:0.38, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true,  alloc:'Core' as const },
  { isin:'LU1681043599', ticker:'PCEU',  name:'Amundi MSCI Europe UCITS',     issuer:'Amundi',  index:'MSCI Europe',        ter:0.18, currency:'EUR', repli:'Physique',    distrib:'Capitalisant', pea:true,  alloc:'Core' as const },
  { isin:'LU1681045370', ticker:'PAEEM', name:'Amundi MSCI Emerging Markets', issuer:'Amundi',  index:'MSCI EM',            ter:0.20, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true,  alloc:'Satellite' as const },
  { isin:'IE00BJZ2DD79', ticker:'RS2K',  name:'SPDR Russell 2000 US Small',   issuer:'SPDR',    index:'Russell 2000',       ter:0.30, currency:'USD', repli:'Physique',    distrib:'Capitalisant', pea:false, alloc:'Satellite' as const },
  { isin:'FR0011550185', ticker:'EWLD',  name:'Lyxor MSCI World UCITS',       issuer:'Lyxor',   index:'MSCI World',         ter:0.45, currency:'EUR', repli:'Synthétique', distrib:'Capitalisant', pea:true,  alloc:'Core' as const },
  { isin:'IE00B4L5Y983', ticker:'IWDA',  name:'iShares Core MSCI World',      issuer:'iShares', index:'MSCI World',         ter:0.20, currency:'USD', repli:'Physique',    distrib:'Capitalisant', pea:false, alloc:'Core' as const },
  { isin:'FR0013412020', ticker:'OBLI',  name:'Amundi Euro Govt Bond 7-10Y',  issuer:'Amundi',  index:'Bloomberg Euro Govt', ter:0.14, currency:'EUR', repli:'Physique',    distrib:'Capitalisant', pea:false, alloc:'Obligations' as const },
];

const SEED_ENVELOPES = [
  { code:'PEA',      glyph:'pea',    label:'PEA',            broker:'Fortuneo',          value:22145.40, invested:19200.00, cash: 1145.78, openedAt:'2021-08-12', plafond:150000 },
  { code:'PEA-PME',  glyph:'peapme', label:'PEA-PME',        broker:'Fortuneo',          value: 3210.00, invested: 3000.00, cash:    0.00, openedAt:'2023-03-04', plafond:225000 },
  { code:'CTO',      glyph:'cto',    label:'CTO',            broker:'Boursorama',        value: 6320.18, invested: 5800.00, cash:  180.42, openedAt:'2022-01-20', plafond:null   },
  { code:'AV',       glyph:'av',     label:'Assurance-Vie',  broker:'Linxea Spirit 2',   value: 8543.10, invested: 8000.00, cash:    0.00, openedAt:'2020-06-01', plafond:null   },
  { code:'PER',      glyph:'per',    label:'PER',            broker:'Linxea PER',        value: 4210.00, invested: 4000.00, cash:    0.00, openedAt:'2023-09-12', plafond:null   },
  { code:'PEE',      glyph:'pee',    label:'PEE',            broker:'Amundi ESR',        value: 2580.00, invested: 2400.00, cash:    0.00, openedAt:'2022-11-01', plafond:null   },
  { code:'Livret A', glyph:'livret', label:'Livret A',       broker:'Boursorama',        value:22950.00, invested:21800.00, cash:22950.00, openedAt:'2014-04-15', plafond: 22950 },
  { code:'LDDS',     glyph:'livret', label:'LDDS',           broker:'Boursorama',        value: 5400.00, invested: 5200.00, cash: 5400.00, openedAt:'2018-09-08', plafond: 12000 },
  { code:'Crypto',   glyph:'crypto', label:'Wallet crypto',  broker:'Coinbase + Ledger', value: 4218.32, invested: 3500.00, cash:    0.00, openedAt:'2021-11-30', plafond:null   },
  { code:'SCPI',     glyph:'immo',   label:'SCPI Iroko Zen', broker:'Direct',            value:12500.00, invested:12000.00, cash:    0.00, openedAt:'2023-05-10', plafond:null   },
  { code:'Or',       glyph:'metal',  label:'Or physique',    broker:'Godot & Fils',      value: 3845.00, invested: 3100.00, cash:    0.00, openedAt:'2022-04-01', plafond:null   },
];

const SEED_TRANSACTIONS = [
  { envelopeCode:'PEA',      etfIsin:'FR0010315770', type:'BUY'      as const, date:'2026-05-12', quantity:12, price: 39.30, fees:0.99, amount: 472.59 },
  { envelopeCode:'PEA',      etfIsin:null,           type:'DEPOSIT'  as const, date:'2026-05-12', quantity: 1, price:  null, fees:0,    amount: 500.00 },
  { envelopeCode:'CTO',      etfIsin:'IE00B4L5Y983', type:'DIVIDEND' as const, date:'2026-05-05', quantity: 1, price:  null, fees:0,    amount:  18.42 },
  { envelopeCode:'Livret A', etfIsin:null,           type:'INTEREST' as const, date:'2026-05-02', quantity: 1, price:  null, fees:0,    amount:  57.38 },
  { envelopeCode:'PEA',      etfIsin:'LU1681043599', type:'BUY'      as const, date:'2026-04-28', quantity: 8, price: 25.51, fees:0.99, amount: 205.07 },
  { envelopeCode:'PEA',      etfIsin:'LU1681045370', type:'BUY'      as const, date:'2026-04-28', quantity:14, price:  5.71, fees:0.99, amount:  80.93 },
  { envelopeCode:'PEA',      etfIsin:null,           type:'DEPOSIT'  as const, date:'2026-04-15', quantity: 1, price:  null, fees:0,    amount: 500.00 },
  { envelopeCode:'PER',      etfIsin:'FR0010261198', type:'BUY'      as const, date:'2026-04-12', quantity: 1, price:481.20, fees:1.50, amount: 482.70 },
  { envelopeCode:'CTO',      etfIsin:'IE00B4L5Y983', type:'SELL'     as const, date:'2026-04-08', quantity: 2, price: 86.20, fees:0.99, amount: 171.41 },
  { envelopeCode:'CTO',      etfIsin:'IE00B4L5Y983', type:'DIVIDEND' as const, date:'2026-03-30', quantity: 1, price:  null, fees:0,    amount:  16.84 },
  { envelopeCode:'PEA',      etfIsin:'FR0010315770', type:'BUY'      as const, date:'2026-03-22', quantity:10, price: 38.50, fees:0.99, amount: 385.99 },
  { envelopeCode:'AV',       etfIsin:null,           type:'DEPOSIT'  as const, date:'2026-03-15', quantity: 1, price:  null, fees:0,    amount: 300.00 },
  { envelopeCode:'Livret A', etfIsin:null,           type:'INTEREST' as const, date:'2026-03-02', quantity: 1, price:  null, fees:0,    amount:  54.21 },
];

async function run(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is required for db:seed');

  const ds = new DataSource(buildDataSourceOptions(databaseUrl));
  await ds.initialize();

  try {
    await ds.transaction(async (em) => {
      const userRepository = em.getRepository(UserOrmEntity);
      const envelopeRepository  = em.getRepository(EnvelopeOrmEntity);
      const etfRepository  = em.getRepository(EtfOrmEntity);
      const transactionRepository   = em.getRepository(TransactionOrmEntity);

      const existing = await userRepository.findOne({ where: { googleId: SEED_USER.googleId } });
      if (existing) {
        console.log(`Seed user already present (${existing.email}). Skipping.`);
        return;
      }

      const user = await userRepository.save(userRepository.create(SEED_USER));
      console.log(`Inserted seed user: ${user.email} (${user.id})`);

      await etfRepository.save(SEED_ETFS.map((e) => etfRepository.create(e)));
      console.log(`Inserted ${SEED_ETFS.length} ETFs`);

      const envelopeRows = await envelopeRepository.save(
        SEED_ENVELOPES.map((e) =>
          envelopeRepository.create({
            ...e,
            openedAt: new Date(e.openedAt),
            userId: user.id,
          }),
        ),
      );
      console.log(`Inserted ${envelopeRows.length} envelopes`);

      const envByCode = new Map(envelopeRows.map((e) => [e.code, e.id]));

      const txRows = SEED_TRANSACTIONS.map((tx) => {
        const envelopeId = envByCode.get(tx.envelopeCode);
        if (!envelopeId) throw new Error(`Unknown envelope code: ${tx.envelopeCode}`);
        return transactionRepository.create({
          userId: user.id,
          envelopeId,
          etfIsin: tx.etfIsin,
          type: tx.type,
          date: new Date(tx.date),
          quantity: tx.quantity,
          price: tx.price,
          fees: tx.fees,
          amount: tx.amount,
        });
      });
      await transactionRepository.save(txRows);
      console.log(`Inserted ${txRows.length} transactions`);
    });
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
