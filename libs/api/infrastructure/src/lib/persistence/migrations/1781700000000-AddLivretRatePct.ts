import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLivretRatePct1781700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_preferences" ADD COLUMN "livret_rate_pct" numeric(5,2) NOT NULL DEFAULT 2.4`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_preferences" DROP COLUMN "livret_rate_pct"`);
  }
}
