import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenEtfAllocTo321781601000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "etfs" ALTER COLUMN "alloc" TYPE varchar(32)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "etfs" ALTER COLUMN "alloc" TYPE varchar(16)`);
  }
}
