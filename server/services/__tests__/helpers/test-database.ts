/**
 * Test Database Helpers
 * 
 * Utilities for managing test database state during integration tests.
 * Provides functions for seeding, cleanup, and verification.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase client configured for testing
 */
export function getTestSupabaseClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Seed product data for testing
 */
export async function seedTestProduct(data: {
  store_id: string;
  title: string;
  slug: string;
  price_amount: number;
  status?: string;
  is_published?: boolean;
}) {
  const supabase = getTestSupabaseClient();

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      store_id: data.store_id,
      title: data.title,
      slug: data.slug,
      status: data.status || 'active',
      is_published: data.is_published !== false,
      price_amount: data.price_amount,
      price_currency: 'USD',
      quantity_available: 100,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed product: ${error.message}`);
  }

  return product;
}

/**
 * Seed order data for testing
 */
export async function seedTestOrder(data: {
  store_id: string;
  order_number: string;
  display_id: string;
  customer_email: string;
  total_amount: number;
}) {
  const supabase = getTestSupabaseClient();

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      store_id: data.store_id,
      order_number: data.order_number,
      display_id: data.display_id,
      customer_email: data.customer_email,
      status: 'pending',
      financial_status: 'pending',
      fulfillment_status: 'unfulfilled',
      total_amount: data.total_amount,
      subtotal_amount: data.total_amount,
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      currency_code: 'USD',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed order: ${error.message}`);
  }

  return order;
}

/**
 * Clean up test data by store IDs
 */
export async function cleanupTestDataByStoreIds(storeIds: string[]) {
  const supabase = getTestSupabaseClient();

  // Delete test products
  await supabase
    .from('products')
    .delete()
    .in('store_id', storeIds);

  // Delete test orders
  await supabase
    .from('orders')
    .delete()
    .in('store_id', storeIds);
}

/**
 * Verify product exists in database
 */
export async function verifyProductExists(productId: string): Promise<boolean> {
  const supabase = getTestSupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .single();

  return !error && !!data;
}

/**
 * Verify order exists in database
 */
export async function verifyOrderExists(orderId: string): Promise<boolean> {
  const supabase = getTestSupabaseClient();

  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single();

  return !error && !!data;
}

/**
 * Count products for a specific store
 */
export async function countProductsForStore(storeId: string): Promise<number> {
  const supabase = getTestSupabaseClient();

  const { count, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId);

  if (error) {
    throw new Error(`Failed to count products: ${error.message}`);
  }

  return count || 0;
}

/**
 * Count orders for a specific store
 */
export async function countOrdersForStore(storeId: string): Promise<number> {
  const supabase = getTestSupabaseClient();

  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId);

  if (error) {
    throw new Error(`Failed to count orders: ${error.message}`);
  }

  return count || 0;
}

