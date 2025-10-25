import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import {
  DashboardStoreList,
  type DashboardStoreMembership,
  type DashboardMembershipTenant,
} from '@/components/dashboard/dashboard-store-list';
import type { Database } from '@/lib/supabase-server';

export default async function DashboardHomePage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/signin');
  }

  const { data: memberships, error } = await supabase
    .from('store_members')
    .select(
      `
        id,
        store_id,
        role,
        created_at,
        tenants:store_id (
          id,
          name,
          subdomain,
          plan_name,
          status,
          subscription_status
        )
      `,
    )
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[dashboard/home] Failed to load store memberships', error);
    throw error;
  }

  type RawMembership = {
    id: string;
    store_id: string;
    role: string;
    created_at: string;
    tenants: DashboardMembershipTenant | DashboardMembershipTenant[] | null;
  };

  const normalizedMemberships: DashboardStoreMembership[] =
    ((memberships ?? []) as RawMembership[]).map((membership) => {
      const tenant = Array.isArray(membership.tenants)
        ? membership.tenants[0] ?? null
        : membership.tenants;

      return {
        id: membership.id,
        store_id: membership.store_id,
        role: membership.role,
        created_at: membership.created_at,
        tenants: tenant,
      };
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Home</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your stores, invite teammates, and customize experiences.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {normalizedMemberships.length === 0 ? (
          <DashboardEmptyState />
        ) : (
          <DashboardStoreList memberships={normalizedMemberships} />
        )}
      </main>
    </div>
  );
}
