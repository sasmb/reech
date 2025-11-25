import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthCard } from '@/components/auth/auth-card';

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard/home');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">
          Reech Admin
        </span>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">
          Sign in to your store
        </h2>
      </div>

      <AuthCard
        mode="sign_in"
        title="Welcome back"
        subtitle="Use your email address and password to continue."
        redirectPath="/dashboard/home"
        footerHint="Don't have an account?"
        footerCta="Create one"
        footerHref="/signup"
      />
    </div>
  );
}
