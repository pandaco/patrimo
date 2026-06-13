import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStrategyVersion1781400000000 implements MigrationInterface {
    name = 'AddStrategyVersion1781400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "strategy_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "label" character varying(16) NOT NULL, "note" text, "targets" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_strategy_versions" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_strategy_versions_user" ON "strategy_versions" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "strategy_versions" ADD CONSTRAINT "FK_strategy_versions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "strategy_versions" DROP CONSTRAINT "FK_strategy_versions_user"`);
        await queryRunner.query(`DROP INDEX "IDX_strategy_versions_user"`);
        await queryRunner.query(`DROP TABLE "strategy_versions"`);
    }

}
