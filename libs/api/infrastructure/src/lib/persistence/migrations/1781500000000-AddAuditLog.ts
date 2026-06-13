import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLog1781500000000 implements MigrationInterface {
    name = 'AddAuditLog1781500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "method" character varying(8) NOT NULL, "resource" character varying(64) NOT NULL, "action" character varying(64) NOT NULL, "entity_id" character varying(64), "status_code" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_audit_log_user_created" ON "audit_log" ("user_id", "created_at")`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_audit_log_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_audit_log_user"`);
        await queryRunner.query(`DROP INDEX "IDX_audit_log_user_created"`);
        await queryRunner.query(`DROP TABLE "audit_log"`);
    }

}
