import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlertRule1780670633581 implements MigrationInterface {
    name = 'AddAlertRule1780670633581'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "alert_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" character varying(64) NOT NULL, "threshold" numeric(12,4) NOT NULL, "channels" jsonb NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ae580564f087ffab9d229225aec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "alert_rules" ADD CONSTRAINT "FK_28f424f9442043318dd4f8a4f58" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "alert_rules" DROP CONSTRAINT "FK_28f424f9442043318dd4f8a4f58"`);
        await queryRunner.query(`DROP TABLE "alert_rules"`);
    }

}
