import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertRead1780640000000 implements MigrationInterface {
  name = 'AlertRead1780640000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "alert_read" (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"      uuid         NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "alert_hash"   varchar(128) NOT NULL,
        "read_at"      timestamptz,
        "dismissed_at" timestamptz
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "alert_read_user_hash_uq" ON "alert_read" ("user_id", "alert_hash")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "alert_read"`);
  }
}
