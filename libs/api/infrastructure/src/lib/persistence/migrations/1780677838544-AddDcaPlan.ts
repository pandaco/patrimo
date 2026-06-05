import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDcaPlan1780677838544 implements MigrationInterface {
    name = 'AddDcaPlan1780677838544'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dca_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "envelope_id" uuid NOT NULL, "amount" numeric(12,4) NOT NULL, "frequency" character varying(16) NOT NULL, "day_of_month" integer NOT NULL, "allocations" jsonb NOT NULL, "active" boolean NOT NULL DEFAULT true, "next_execution" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_da446e235a8af5ab2e2799adb70" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "dca_plans" ADD CONSTRAINT "FK_0e6efe9e83ef4d4fe1c13554cd3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dca_plans" ADD CONSTRAINT "FK_84ac4774c5120d93856f306ed61" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dca_plans" DROP CONSTRAINT "FK_84ac4774c5120d93856f306ed61"`);
        await queryRunner.query(`ALTER TABLE "dca_plans" DROP CONSTRAINT "FK_0e6efe9e83ef4d4fe1c13554cd3"`);
        await queryRunner.query(`DROP TABLE "dca_plans"`);
    }

}
