import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropEtfWatchOnly1783987200000 implements MigrationInterface {
  name = 'DropEtfWatchOnly1783987200000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "etfs" DROP COLUMN "watch_only"`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "etfs" ADD COLUMN "watch_only" boolean NOT NULL DEFAULT false`);
  }
}
