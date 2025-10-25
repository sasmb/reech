import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { AuthCard } from '@/components/auth/auth-card';
import type { Database } from '@/lib/supabase-server';

export default async function SignUpPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
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
          Create your account
        </h2>
      </div>

      <AuthCard
        mode="sign_up"
        title="Join Reech"
        subtitle="Set up your credentials to access the dashboard."
        redirectPath="/dashboard/home"
        footerHint="Already have an account?"
        footerCta="Sign in"
        footerHref="/signin"
      />
    </div>
  );
}
