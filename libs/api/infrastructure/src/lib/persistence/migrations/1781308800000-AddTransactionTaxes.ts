import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionTaxes1781308800000 implements MigrationInterface {
  name = 'AddTransactionTaxes1781308800000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "taxes" numeric(18,6) NOT NULL DEFAULT 0
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "transactions" DROP COLUMN "taxes"`);
  }
}
