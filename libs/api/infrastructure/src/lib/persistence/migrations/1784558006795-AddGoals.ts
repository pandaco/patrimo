import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoals1784558006795 implements MigrationInterface {
    name = 'AddGoals1784558006795'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "strategy_versions" DROP CONSTRAINT "FK_strategy_versions_user"`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_audit_log_user"`);
        await queryRunner.query(`ALTER TABLE "wealth_snapshot" DROP CONSTRAINT "FK_wealth_snapshot_user"`);
        await queryRunner.query(`ALTER TABLE "liabilities" DROP CONSTRAINT "FK_liabilities_user"`);
        await queryRunner.query(`DROP INDEX "public"."transactions_transfer_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_strategy_versions_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_user_created"`);
        await queryRunner.query(`DROP INDEX "public"."liabilities_user_id_idx"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD "goal_name" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ADD "goal_target" numeric(18,6)`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ALTER COLUMN "livret_rate_pct" SET DEFAULT '2.4'`);
        await queryRunner.query(`CREATE INDEX "IDX_f94710726106bed3c23f4619ae" ON "audit_log" ("user_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "strategy_versions" ADD CONSTRAINT "FK_deb4ba10219b1faa9997d0b38d1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_cb11bd5b662431ea0ac455a27d7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wealth_snapshot" ADD CONSTRAINT "FK_67bb76e05d7c590acbd1fa58518" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liabilities" ADD CONSTRAINT "FK_67ec8a073e2ff3ca973be3fa7ea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liabilities" DROP CONSTRAINT "FK_67ec8a073e2ff3ca973be3fa7ea"`);
        await queryRunner.query(`ALTER TABLE "wealth_snapshot" DROP CONSTRAINT "FK_67bb76e05d7c590acbd1fa58518"`);
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_cb11bd5b662431ea0ac455a27d7"`);
        await queryRunner.query(`ALTER TABLE "strategy_versions" DROP CONSTRAINT "FK_deb4ba10219b1faa9997d0b38d1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f94710726106bed3c23f4619ae"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" ALTER COLUMN "livret_rate_pct" SET DEFAULT 2.4`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP COLUMN "goal_target"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP COLUMN "goal_name"`);
        await queryRunner.query(`CREATE INDEX "liabilities_user_id_idx" ON "liabilities" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_audit_log_user_created" ON "audit_log" ("created_at", "user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_strategy_versions_user" ON "strategy_versions" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "transactions_transfer_idx" ON "transactions" ("transfer_id") WHERE (transfer_id IS NOT NULL)`);
        await queryRunner.query(`ALTER TABLE "liabilities" ADD CONSTRAINT "FK_liabilities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wealth_snapshot" ADD CONSTRAINT "FK_wealth_snapshot_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_audit_log_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "strategy_versions" ADD CONSTRAINT "FK_strategy_versions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
