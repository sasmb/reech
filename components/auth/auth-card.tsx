'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

type AuthMode = 'sign_in' | 'sign_up';

interface AuthCardProps {
  mode: AuthMode;
  title: string;
  subtitle: string;
  redirectPath: string;
  footerHint: string;
  footerCta: string;
  footerHref: string;
}

export function AuthCard({
  mode,
  title,
  subtitle,
  redirectPath,
  footerHint,
  footerCta,
  footerHref,
}: AuthCardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseClient = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  useEffect(() => {
    if (!isLoading && session) {
      router.replace(redirectPath);
    }
  }, [isLoading, redirectPath, router, session]);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return new URL(redirectPath, window.location.origin).toString();
  }, [redirectPath]);

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <Auth
        supabaseClient={supabaseClient}
        view={mode}
        redirectTo={redirectTo}
        appearance={{
          theme: ThemeSupa,
          className: {
            container: 'space-y-4',
            label: 'text-sm font-medium text-slate-700',
            input:
              'w-full rounded-lg border border-slate-300 px-3 py-2 text-base transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100',
            button:
              'w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100',
            anchor: 'text-sm font-medium text-blue-600 hover:text-blue-500',
            message: 'text-sm text-red-600',
          },
          variables: {
            default: {
              colors: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
              },
            },
          },
        }}
        providers={[]}
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email address',
              password_label: 'Password',
              button_label: 'Sign in',
            },
            sign_up: {
              email_label: 'Email address',
              password_label: 'Password',
              button_label: 'Create account',
            },
          },
        }}
      />

      <p className="text-center text-sm text-slate-500">
        {footerHint}{' '}
        <Link
          className="font-medium text-blue-600 hover:text-blue-500"
          href={footerHref}
        >
          {footerCta}
        </Link>
      </p>
    </div>
  );
}
