import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEtfWatchOnly1781311000000 implements MigrationInterface {
  name = 'AddEtfWatchOnly1781311000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "etfs" ADD COLUMN "watch_only" boolean NOT NULL DEFAULT false`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "etfs" DROP COLUMN "watch_only"`);
  }
}
