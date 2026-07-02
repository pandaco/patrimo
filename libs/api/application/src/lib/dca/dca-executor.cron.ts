import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DCA_PLAN_REPOSITORY,
  DcaPlanRepository,
  TRANSACTION_REPOSITORY,
  TransactionRepository,
  ETF_REPOSITORY,
  EtfRepository,
  DcaPlan
} from '@patrimo/api-domain';
import { PriceService } from '../market/price.service';

@Injectable()
export class DcaExecutorCron {
  private readonly logger = new Logger(DcaExecutorCron.name);

  constructor(
    @Inject(DCA_PLAN_REPOSITORY)
    private readonly dcaPlanRepository: DcaPlanRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
    @Inject(ETF_REPOSITORY)
    private readonly etfRepository: EtfRepository,
    private readonly priceService: PriceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async executePlans() {
    this.logger.log('Starting DCA execution check...');
    const now = new Date();
    const duePlans = await this.dcaPlanRepository.findActiveDueForExecution(now);

    if (duePlans.length === 0) {
      this.logger.log('No DCA plans due for execution today.');
      return;
    }

    for (const plan of duePlans) {
      try {
        await this.processPlan(plan, now);
        this.logger.log(`Successfully executed DCA plan ${plan.id}`);
      } catch (err) {
        this.logger.error(`Failed to process DCA plan ${plan.id}: ${(err as Error).message}`);
      }
    }
  }

  private async processPlan(plan: DcaPlan, execDate: Date) {
    let totalInvested = 0;

    for (const [isin, amountEur] of Object.entries(plan.allocations)) {
      if (typeof amountEur !== 'number' || amountEur <= 0) continue;

      const etf = await this.etfRepository.findByIsin(isin);
      if (!etf) {
        this.logger.warn(`DCA Execution: ETF ${isin} not found for plan ${plan.id}`);
        continue;
      }

      const quote = await this.priceService.getQuote(etf.isin, etf.ticker);
      if (!quote.price || quote.price <= 0) {
        this.logger.warn(`DCA Execution: No valid price for ETF ${etf.ticker} (plan ${plan.id})`);
        continue;
      }

      const qty = Math.floor(amountEur / quote.price);
      if (qty <= 0) {
        this.logger.warn(`DCA Execution: Amount ${amountEur}€ insufficient to buy 1 share of ${etf.ticker} (${quote.price}€)`);
        continue;
      }

      const txAmount = qty * quote.price;

      await this.transactionRepository.create({
        userId: plan.userId,
        envelopeId: plan.envelopeId,
        etfIsin: etf.isin,
        type: 'BUY',
        date: execDate,
        quantity: qty,
        price: quote.price,
        fees: 0, // Could be configured in plan or globally later
        taxes: 0,
        transferId: null,
        amount: txAmount,
      });

      totalInvested += txAmount;
    }

    // Deduct total invested from the envelope cash via a DEPOSIT transaction with negative amount?
    // In Patrimo, cash is just the sum of deposits minus buys + sells + divs.
    // If the user hasn't deposited enough cash, should we still execute?
    // Let's assume DCA implies an automatic deposit for now, or just buys the ETFs.
    // We will create a DEPOSIT transaction to fund this DCA execution.
    if (totalInvested > 0) {
      await this.transactionRepository.create({
        userId: plan.userId,
        envelopeId: plan.envelopeId,
        etfIsin: null,
        type: 'DEPOSIT',
        date: execDate,
        quantity: 0,
        price: null,
        fees: 0,
        taxes: 0,
        transferId: null,
        amount: totalInvested, // Fund the envelope by the exact amount invested
      });
    }

    // Update the next execution date
    await this.dcaPlanRepository.updateForUser(plan.id, plan.userId, { dayOfMonth: plan.dayOfMonth }); // Trigger the update hook for nextExecution
  }
}
