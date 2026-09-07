/**
 * Sequelize PostgreSQL Database Configuration
 * Supports Local Development, Docker, Supabase, AWS RDS, & Production Pooling
 */
import { Sequelize } from 'sequelize';
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

export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      port: dbPort,
      dialect: 'postgres',
      logging: isProduction ? false : (msg) => console.log(`[Sequelize] ${msg}`),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: isSupabaseHost || isProduction
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false, // Required for cloud hosts like Supabase/Neon
            },
          }
        : {},
    });

export const testDbConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL/Supabase Database connected successfully via Sequelize.');
    return true;
  } catch (error) {
    console.warn('ℹ️ PostgreSQL/Supabase direct connection note (falling back to JSON/API mode if unset):', (error as Error).message);
    return false;
  }
};
