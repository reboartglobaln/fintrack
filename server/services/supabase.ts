/**
 * Supabase Integration Service
 * Connects FinTrack to Supabase PostgreSQL Database with zero mock fallback
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseClient: SupabaseClient | null = null;

/**
 * Check if valid Supabase credentials have been provided via environment variables
 */
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY
  )?.trim();

  return Boolean(url && key && (url.startsWith('https://') || url.startsWith('http://')));
};

/**
 * Safely obtain the initialized Supabase client instance (lazy initialization)
 */
export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL!.trim();
    const key = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY
    )!.trim();

    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
};

/**
 * Test connectivity to Supabase and probe tables
 */
export const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase credentials not configured in environment (SUPABASE_URL, SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).',
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      configured: false,
      connected: false,
      message: 'Failed to initialize Supabase client.',
    };
  }

  try {
    // Attempt a lightweight probe on the users table or system table
    const { error } = await client.from('users').select('id').limit(1);

    if (error) {
      // Table might not exist yet or permissions issue
      return {
        configured: true,
        connected: false,
        message: `Connected to Supabase endpoint, but table query returned: ${error.message}. Please run database/schema.sql in Supabase SQL Editor.`,
        error: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
      endpoint: process.env.SUPABASE_URL?.split('@')[0],
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      message: `Failed to connect to Supabase: ${(err as Error).message}`,
      error: (err as Error).message,
    };
  }
};
