import Link from 'next/link';
import { Plus } from 'lucide-react';

export function DashboardEmptyState() {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-12 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Plus className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h2 className="text-2xl font-semibold text-slate-900">
        You don&apos;t have any stores yet
      </h2>
      <p className="mt-3 max-w-md text-sm text-slate-500">
        Create a store to start configuring themes, products, and experiences.
        You can invite teammates once your store is ready.
      </p>
      <Link
        href="/dashboard/stores/new"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Create your first store
      </Link>
    </section>
  );
}
