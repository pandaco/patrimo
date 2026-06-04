// DataSource entry point used by the TypeORM CLI (migrations).
// Not loaded by Nest at runtime — runtime config goes through PersistenceModule.
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

loadEnv();

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the TypeORM CLI');
}

export default new DataSource(buildDataSourceOptions(databaseUrl));
