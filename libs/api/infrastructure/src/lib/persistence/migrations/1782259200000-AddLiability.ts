import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLiability1782259200000 implements MigrationInterface {
    name = 'AddLiability1782259200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "liabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "label" varchar(128) NOT NULL, "kind" varchar(32) NOT NULL, "initial_amount" numeric(18,2) NOT NULL, "current_balance" numeric(18,2) NOT NULL, "rate_pct" numeric(5,2) NOT NULL, "monthly_payment" numeric(18,2) NOT NULL, "start_date" date NOT NULL, "end_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_liabilities" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "liabilities_user_id_idx" ON "liabilities" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "liabilities" ADD CONSTRAINT "FK_liabilities_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liabilities" DROP CONSTRAINT "FK_liabilities_user"`);
        await queryRunner.query(`DROP INDEX "liabilities_user_id_idx"`);
        await queryRunner.query(`DROP TABLE "liabilities"`);
    }

}
