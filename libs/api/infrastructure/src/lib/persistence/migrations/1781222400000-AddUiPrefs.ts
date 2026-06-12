import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUiPrefs1781222400000 implements MigrationInterface {
  name = 'AddUiPrefs1781222400000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "user_preferences"
        ADD COLUMN "ui_mode" varchar(8) NOT NULL DEFAULT 'simple',
        ADD COLUMN "onboarding_done" boolean NOT NULL DEFAULT false
    `);
    // Existing rows belong to users who already configured the app — keep
    // them in the full-featured mode and skip the welcome flow.
    await q.query(`UPDATE "user_preferences" SET "ui_mode" = 'expert', "onboarding_done" = true`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE "user_preferences"
        DROP COLUMN "ui_mode",
        DROP COLUMN "onboarding_done"
    `);
  }
}
