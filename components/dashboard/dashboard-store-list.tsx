import Link from 'next/link';
import { Building2, ExternalLink, ShieldCheck } from 'lucide-react';

export interface DashboardMembershipTenant {
  id: string;
  name: string;
  subdomain: string;
  plan_name: string | null;
  status: string | null;
  subscription_status: string | null;
}

export interface DashboardStoreMembership {
  id: string;
  store_id: string;
  role: string;
  created_at: string;
  tenants: DashboardMembershipTenant | null;
}

interface DashboardStoreListProps {
  memberships: DashboardStoreMembership[];
}

export function DashboardStoreList({ memberships }: DashboardStoreListProps) {
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your stores</h2>
          <p className="text-sm text-slate-500">
            Select a store to configure experiences and manage operations.
          </p>
        </div>
        <Link
          href="/dashboard/stores/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <Building2 className="h-4 w-4" strokeWidth={2} />
          Create store
        </Link>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {memberships.map((membership) => {
          const tenant = membership.tenants;
          const storeName = tenant?.name ?? 'Untitled store';
          const subdomain = tenant?.subdomain ?? '—';
          const planName = tenant?.plan_name ?? 'Trial';
          const status = tenant?.status ?? 'pending';
          const subscriptionStatus = tenant?.subscription_status ?? 'trial';

          return (
            <article
              key={membership.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {storeName}
                  </h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-600">
                    {membership.role}
                  </span>
                </div>

                <dl className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Subdomain</dt>
                    <dd>{subdomain}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Plan</dt>
                    <dd>{planName}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-slate-600">Status</dt>
                    <dd className="inline-flex items-center gap-1 capitalize">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      {status}
                      <span className="text-slate-400">
                        ({subscriptionStatus})
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <Link
                href={`/preview/${membership.store_id}`}
                className="mt-6 inline-flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
              >
                <span>Open store dashboard</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
