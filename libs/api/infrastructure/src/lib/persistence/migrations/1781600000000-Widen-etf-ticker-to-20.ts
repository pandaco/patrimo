import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenEtfTickerTo201781600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "etfs" ALTER COLUMN "ticker" TYPE varchar(20)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "etfs" ALTER COLUMN "ticker" TYPE varchar(16)`);
  }
}
