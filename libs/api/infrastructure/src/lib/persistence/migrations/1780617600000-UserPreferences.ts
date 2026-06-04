import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPreferences1780617600000 implements MigrationInterface {
  name = 'UserPreferences1780617600000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE "user_preferences" (
        "user_id"          uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
        "risk_profile"     varchar(64)   NOT NULL DEFAULT 'Équilibré dynamique',
        "horizon_years"    integer       NOT NULL DEFAULT 25,
        "monthly_target"   numeric(18,6) NOT NULL DEFAULT 0,
        "display_currency" varchar(8)    NOT NULL DEFAULT 'EUR',
        "allocation_targets" jsonb,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "user_preferences"`);
  }
}
