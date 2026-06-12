import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBenchmarkPref1781310000000 implements MigrationInterface {
  name = 'AddBenchmarkPref1781310000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "user_preferences"
        ADD COLUMN "benchmark_isin" varchar(12) NOT NULL DEFAULT 'FR0010261198'
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "user_preferences" DROP COLUMN "benchmark_isin"`);
  }
}
