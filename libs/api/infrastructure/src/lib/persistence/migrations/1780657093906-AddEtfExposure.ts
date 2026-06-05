import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEtfExposure1780657093906 implements MigrationInterface {
    name = 'AddEtfExposure1780657093906'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_read" DROP CONSTRAINT "alert_read_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "envelopes" DROP CONSTRAINT "envelopes_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "transactions_envelope_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "transactions_etf_isin_fkey"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "user_preferences_user_id_fkey"`);
        await queryRunner.query(`DROP INDEX "public"."alert_read_user_hash_uq"`);
        await queryRunner.query(`ALTER TABLE "etfs" ADD "exposure" jsonb`);
        await queryRunner.query(`ALTER TABLE "alert_read" ADD CONSTRAINT "FK_79891277a7f3636068ec2e0680d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "envelopes" ADD CONSTRAINT "FK_34f4b5e4284d8b60850549cf1b2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_1238cbb5fa225575e81ce739895" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_0c9ccf6e9604f4b458bf7a8cd2c" FOREIGN KEY ("etf_isin") REFERENCES "etfs"("isin") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "FK_458057fa75b66e68a275647da2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT "FK_458057fa75b66e68a275647da2e"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_0c9ccf6e9604f4b458bf7a8cd2c"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_1238cbb5fa225575e81ce739895"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_e9acc6efa76de013e8c1553ed2b"`);
        await queryRunner.query(`ALTER TABLE "envelopes" DROP CONSTRAINT "FK_34f4b5e4284d8b60850549cf1b2"`);
        await queryRunner.query(`ALTER TABLE "alert_read" DROP CONSTRAINT "FK_79891277a7f3636068ec2e0680d"`);
        await queryRunner.query(`ALTER TABLE "etfs" DROP COLUMN "exposure"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "alert_read_user_hash_uq" ON "alert_read" ("alert_hash", "user_id") `);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "transactions_etf_isin_fkey" FOREIGN KEY ("etf_isin") REFERENCES "etfs"("isin") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "transactions_envelope_id_fkey" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "envelopes" ADD CONSTRAINT "envelopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alert_read" ADD CONSTRAINT "alert_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
