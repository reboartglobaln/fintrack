/**
 * Sequelize PostgreSQL Database Configuration
 * Supports Local Development, Docker, Supabase, AWS RDS, & Production Pooling
 */
import { Sequelize } from 'sequelize';
// Sequelize resolves its driver with a dynamic `require(dialectName)`, which
// serverless bundlers cannot trace, so `pg` is left out of the deployed function.
// Importing it statically and passing it as `dialectModule` makes it traceable.
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbName = process.env.DB_NAME || 'fintrack_db';
const isProduction = process.env.NODE_ENV === 'production';
const isSupabaseHost = (databaseUrl && databaseUrl.includes('supabase')) || dbHost.includes('supabase');
const sslEnabled =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' && (isSupabaseHost || (databaseUrl && /neon|supabase|render|aws/i.test(databaseUrl))));

export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectModule: pg,
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: sslEnabled
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
    })
  : new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      dialectModule: pg,
      logging: isProduction ? false : (msg) => console.log(`[Sequelize] ${msg}`),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: sslEnabled
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false, // Required for cloud hosts like Supabase/Neon
            },
          }
        : {},
    });

import fs from 'fs';
import path from 'path';

export const initDatabaseSchema = async (): Promise<boolean> => {
  try {
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await sequelize.query(sql);
      console.log('✅ Database Schema verified and synchronized automatically from schema.sql.');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('⚠️ Auto-schema sync note:', (err as Error).message);
    return false;
  }
};

export const testDbConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL/Supabase Database connected successfully via Sequelize.');
    await initDatabaseSchema();
    return true;
  } catch (error) {
    console.warn('ℹ️ PostgreSQL/Supabase direct connection note (falling back to JSON/API mode if unset):', (error as Error).message);
    return false;
  }
};
