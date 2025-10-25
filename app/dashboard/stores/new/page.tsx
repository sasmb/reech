import Link from 'next/link';

export default function CreateStorePlaceholderPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Create store</h1>
        <p className="mt-3 text-sm text-slate-500">
          Store creation is coming soon. This placeholder route prevents broken
          links while the flow is finalized.
        </p>
        <Link
          href="/dashboard/home"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}
