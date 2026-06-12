import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransferId1781312000000 implements MigrationInterface {
  name = 'AddTransferId1781312000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "transactions" ADD COLUMN "transfer_id" uuid`);
    await q.query(`CREATE INDEX "transactions_transfer_idx" ON "transactions" ("transfer_id") WHERE "transfer_id" IS NOT NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX "transactions_transfer_idx"`);
    await q.query(`ALTER TABLE "transactions" DROP COLUMN "transfer_id"`);
  }
}
