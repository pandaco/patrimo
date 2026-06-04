import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1780531200000 implements MigrationInterface {
  name = 'Init1780531200000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await q.query(`
      CREATE TABLE "users" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "google_id"   varchar(64)  NOT NULL,
        "email"       varchar(320) NOT NULL,
        "name"        varchar(200) NOT NULL,
        "first_name"  varchar(100) NOT NULL DEFAULT '',
        "last_name"   varchar(100) NOT NULL DEFAULT '',
        "initials"    varchar(8)   NOT NULL DEFAULT '',
        "picture"     text,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        "updated_at"  timestamptz  NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "users_google_id_uq" ON "users" ("google_id")`);
    await q.query(`CREATE UNIQUE INDEX "users_email_uq"     ON "users" ("email")`);

    await q.query(`
      CREATE TABLE "envelopes" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"    uuid          NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "code"       varchar(32)   NOT NULL,
        "glyph"      varchar(32)   NOT NULL,
        "label"      varchar(64)   NOT NULL,
        "broker"     varchar(128)  NOT NULL,
        "value"      numeric(18,6) NOT NULL,
        "invested"   numeric(18,6) NOT NULL,
        "cash"       numeric(18,6) NOT NULL,
        "opened_at"  date          NOT NULL,
        "plafond"    numeric(18,6),
        "created_at" timestamptz   NOT NULL DEFAULT now(),
        "updated_at" timestamptz   NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "envelopes_user_code_uq" ON "envelopes" ("user_id", "code")`);

    await q.query(`
      CREATE TABLE "etfs" (
        "isin"       varchar(12) PRIMARY KEY,
        "ticker"     varchar(16)   NOT NULL,
        "name"       varchar(128)  NOT NULL,
        "issuer"     varchar(64)   NOT NULL,
        "index"      varchar(64)   NOT NULL,
        "ter"        numeric(8,4)  NOT NULL,
        "currency"   varchar(8)    NOT NULL,
        "repli"      varchar(32)   NOT NULL,
        "distrib"    varchar(32)   NOT NULL,
        "pea"        boolean       NOT NULL,
        "alloc"      varchar(16)   NOT NULL,
        "created_at" timestamptz   NOT NULL DEFAULT now(),
        "updated_at" timestamptz   NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE UNIQUE INDEX "etfs_ticker_uq" ON "etfs" ("ticker")`);

    await q.query(`
      CREATE TABLE "transactions" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     uuid          NOT NULL REFERENCES "users"("id")     ON DELETE CASCADE,
        "envelope_id" uuid          NOT NULL REFERENCES "envelopes"("id") ON DELETE CASCADE,
        "etf_isin"    varchar(12)            REFERENCES "etfs"("isin")    ON DELETE SET NULL,
        "type"        varchar(16)   NOT NULL,
        "date"        date          NOT NULL,
        "quantity"    numeric(18,6) NOT NULL,
        "price"       numeric(18,6),
        "fees"        numeric(18,6) NOT NULL,
        "amount"      numeric(18,6) NOT NULL,
        "created_at"  timestamptz   NOT NULL DEFAULT now(),
        "updated_at"  timestamptz   NOT NULL DEFAULT now()
      )
    `);
    await q.query(`CREATE INDEX "transactions_user_date_idx" ON "transactions" ("user_id", "date" DESC)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "transactions"`);
    await q.query(`DROP TABLE IF EXISTS "etfs"`);
    await q.query(`DROP TABLE IF EXISTS "envelopes"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
  }
}
