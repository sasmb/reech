import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { SupabaseProvider } from '@/components/supabase-provider';
import { SupabaseListener } from '@/components/supabase-listener';
import type { Database } from '@/lib/supabase-server';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Reech SaaS - Multi-Tenant Platform',
  description: 'Next.js multi-tenant SaaS platform with dynamic store configuration.'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <SupabaseProvider session={session}>
          <SupabaseListener accessToken={session?.access_token ?? null} />
          <Providers>
            {children}
          </Providers>
        </SupabaseProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
