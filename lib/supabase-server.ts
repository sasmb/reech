/**
 * Supabase Server Client Utility
 * 
 * Provides a server-side Supabase client for database operations in the service layer.
 * This client is used for:
 * - Store configuration CRUD operations
 * - Database queries in tRPC procedures
 * - Server-side data fetching
 * 
 * SECURITY:
 * - Uses service role key for admin operations (when needed)
 * - Uses anon key for standard operations with RLS
 * - Never expose service role key to client
 * 
 * USAGE:
 * ```typescript
 * import { getSupabaseClient } from '@/lib/supabase-server';
 * 
 * const supabase = getSupabaseClient();
 * const { data, error } = await supabase
 *   .from('store_configs')
 *   .select('*')
 *   .eq('store_id', storeId)
 *   .single();
 * ```
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Database Types
 * 
 * Define the database schema types for type-safe operations
 */
export interface Database {
  public: {
    Tables: {
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: string;
          invited_by: string | null;
          invited_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role?: string;
          invited_by?: string | null;
          invited_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          user_id?: string;
          role?: string;
          invited_by?: string | null;
          invited_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      store_configs: {
        Row: {
          id: string;
          store_id: string;
          version: string;
          config: any; // JSONB
          theme: any; // JSONB
          layout: any; // JSONB
          features: any; // JSONB
          integrations: any; // JSONB
          metadata: any; // JSONB
          seo: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          version?: string;
          config?: any;
          theme?: any;
          layout?: any;
          features?: any;
          integrations?: any;
          metadata?: any;
          seo?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          version?: string;
          config?: any;
          theme?: any;
          layout?: any;
          features?: any;
          integrations?: any;
          metadata?: any;
          seo?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          subdomain: string;
          name: string;
          slug: string;
          status: string;
          subscription_status: string;
          trial_ends_at: string | null;
          subscription_ends_at: string | null;
          owner_email: string | null;
          owner_name: string | null;
          plan_id: string | null;
          plan_name: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          subdomain: string;
          name: string;
          slug: string;
          status?: string;
          subscription_status?: string;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          owner_email?: string | null;
          owner_name?: string | null;
          plan_id?: string | null;
          plan_name?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          subdomain?: string;
          name?: string;
          slug?: string;
          status?: string;
          subscription_status?: string;
          trial_ends_at?: string | null;
          subscription_ends_at?: string | null;
          owner_email?: string | null;
          owner_name?: string | null;
          plan_id?: string | null;
          plan_name?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
  };
}

/**
 * Supabase Client Singleton
 * Ensures we reuse the same client instance across the application
 */
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Resolve Supabase environment configuration.
 *
 * @throws {Error} If either URL or anon key is missing
 * @returns Supabase URL and anon key
 */
export function getSupabaseConfig() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.',
    );
  }

  return { supabaseUrl, supabaseKey };
}

/**
 * Get Supabase Client
 * 
 * Returns a singleton instance of the Supabase client.
 * Uses environment variables for configuration.
 * 
 * @throws {Error} If environment variables are not configured
 * @returns Supabase client instance
 */
export function getSupabaseClient() {
  // Reuse existing client if available
  if (supabaseClient) {
    return supabaseClient;
  }

  // Validate environment variables
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  // Create and cache the client
  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // No session persistence needed for server-side
      autoRefreshToken: false, // No token refresh needed for server-side
    },
  });

  return supabaseClient;
}

/**
 * Get Supabase Admin Client
 * 
 * Returns a Supabase client with admin privileges (service role).
 * Use this ONLY for operations that require bypassing RLS.
 * 
 * ⚠️ WARNING: Never expose this client or its key to the frontend!
 * 
 * @throws {Error} If service role key is not configured
 * @returns Supabase admin client instance
 */
export function getSupabaseAdminClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase admin environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Reset Supabase Client
 * 
 * Clears the cached Supabase client instance.
 * Useful for testing or when configuration changes.
 */
export function resetSupabaseClient() {
  supabaseClient = null;
}
