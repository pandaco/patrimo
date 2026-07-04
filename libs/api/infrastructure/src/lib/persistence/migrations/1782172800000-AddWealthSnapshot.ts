import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWealthSnapshot1782172800000 implements MigrationInterface {
    name = 'AddWealthSnapshot1782172800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wealth_snapshot" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "date" date NOT NULL, "total" numeric(18,2) NOT NULL, "by_category" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_wealth_snapshot" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "wealth_snapshot_user_date_uq" ON "wealth_snapshot" ("user_id", "date")`);
        await queryRunner.query(`ALTER TABLE "wealth_snapshot" ADD CONSTRAINT "FK_wealth_snapshot_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wealth_snapshot" DROP CONSTRAINT "FK_wealth_snapshot_user"`);
        await queryRunner.query(`DROP INDEX "wealth_snapshot_user_date_uq"`);
        await queryRunner.query(`DROP TABLE "wealth_snapshot"`);
    }

}
