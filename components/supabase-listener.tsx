'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionContext } from '@supabase/auth-helpers-react';

interface SupabaseListenerProps {
  accessToken: string | null;
}

export function SupabaseListener({ accessToken }: SupabaseListenerProps) {
  const { supabaseClient } = useSessionContext();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      const newAccessToken = session?.access_token ?? null;

      if (newAccessToken === accessToken) {
        return;
      }

      void fetch('/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ event, session }),
      })
        .then(() => router.refresh())
        .catch((listenerError) => {
          console.error('Failed to sync Supabase auth state', listenerError);
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [accessToken, router, supabaseClient]);

  return null;
}
