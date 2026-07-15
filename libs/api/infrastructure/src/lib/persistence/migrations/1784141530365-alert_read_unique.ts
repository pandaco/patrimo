import { MigrationInterface, QueryRunner } from "typeorm";

export class AlertReadUnique1784141530365 implements MigrationInterface {
    name = 'AlertReadUnique1784141530365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_read" ADD CONSTRAINT "UQ_491e536b809dca814fb70fe7190" UNIQUE ("user_id", "alert_hash")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_read" DROP CONSTRAINT "UQ_491e536b809dca814fb70fe7190"`);
    }

}
