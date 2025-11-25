import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Layers,
  LineChart,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';

const primaryCta =
  'inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300';

const secondaryCta =
  'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200';

const featureCards = [
  {
    title: 'Preview First Workflow',
    description:
      'Launch into a fully functional preview experience. Customize layouts, products, and themes before you claim a subdomain.',
    icon: Layers,
    gradient: 'from-blue-500/40 via-blue-500/10 to-transparent',
    iconClass: 'text-blue-300',
  },
  {
    title: 'Design Without Limits',
    description:
      'Our visual editor gives you granular control over typography, color, layout, and sections with no code required.',
    icon: Wand2,
    gradient: 'from-purple-500/40 via-purple-500/10 to-transparent',
    iconClass: 'text-purple-300',
  },
  {
    title: 'Collaborative by Default',
    description:
      'Invite teammates, assign roles, and review changes together. Built-in access controls keep every store secure.',
    icon: Users,
    gradient: 'from-emerald-500/40 via-emerald-500/10 to-transparent',
    iconClass: 'text-emerald-300',
  },
];

const workflow = [
  {
    title: 'Sign Up',
    description:
      'Create your Reech account to unlock the dashboard. No credit card required during preview.',
  },
  {
    title: 'Design in Preview',
    description:
      'Customize your storefront with instant feedback. Add products, tweak branding, and test flows.',
  },
  {
    title: 'Invite Your Team',
    description:
      'Bring collaborators into the same environment with fine-grained permissions.',
  },
  {
    title: 'Publish When Ready',
    description:
      'Choose your subdomain, switch to production, and start selling with confidence.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white">
      {/* Decorative glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-15%] h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute right-[-10%] top-[40%] h-[380px] w-[380px] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute left-[-10%] bottom-[10%] h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Reech</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#workflow" className="transition hover:text-white">
              Workflow
            </a>
            <a href="#security" className="transition hover:text-white">
              Security
            </a>
            <Link href="/admin" className="transition hover:text-white">
              Admin
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden text-sm font-semibold text-slate-300 transition hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link href="/signup" className="hidden sm:inline-flex">
              <span className={primaryCta}>
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            </Link>
            <Link href="/signup" className="sm:hidden">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-white/5">
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:flex lg:items-center lg:gap-12 lg:px-8 lg:py-32">
            <div className="max-w-2xl space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-200">
                <Sparkles className="h-3.5 w-3.5" />
                Preview-first commerce
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Build your store
                <span className="block bg-gradient-to-r from-blue-400 via-purple-300 to-emerald-300 bg-clip-text text-transparent">
                  before you publish it
                </span>
              </h1>
              <p className="text-lg text-slate-300 sm:text-xl">
                Reech lets founders design, test, and share immersive store previews
                without worrying about domains or infrastructure. Move fast, nail the
                experience, then deploy when you’re ready.
              </p>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link href="/signup" className={primaryCta}>
                  Start building free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/signin" className={secondaryCta}>
                  Sign in to dashboard
                </Link>
              </div>

              <div className="grid gap-4 pt-8 sm:grid-cols-3">
                {[
                  { value: '10k+', label: 'Store previews launched' },
                  { value: '<24h', label: 'Average time to first publish' },
                  { value: '99.99%', label: 'Uptime backed by Supabase' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-center sm:text-left"
                  >
                    <p className="text-2xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-300">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 hidden flex-1 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-blue-500/20 lg:block">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300">
                <span>Preview Canvas</span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Live feedback
                </span>
              </div>
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Modern storefront
                    </p>
                    <p className="text-xs text-slate-400">
                      Update hero, typography, and CTAs instantly
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-300">
                    preview
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Live preview window
                  </p>
                  <div className="mt-3 h-40 rounded-xl border border-dashed border-white/10 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10" />
                  <p className="mt-3 text-xs text-slate-400">
                    Your edits sync instantly with the preview canvas. Share a secure
                    link with stakeholders before publishing.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Publish checklist
                    </span>
                    <span className="text-xs text-blue-300">3 of 4 complete</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {['Branding applied', 'Team invited', 'Product catalog synced'].map(
                      (item) => (
                        <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                          {item}
                        </div>
                      ),
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                      Choose your subdomain to go live
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section id="features" className="border-b border-white/5 bg-slate-950/40 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Everything you need to launch with confidence
              </h2>
              <p className="mt-4 text-base text-slate-300">
                Reech unifies the preview, collaboration, and publish experience so you
                can focus on delivering the perfect storefront.
              </p>
            </div>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {featureCards.map((feature) => (
                <article
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-8 shadow-lg transition hover:-translate-y-1 hover:border-white/10 hover:bg-white/10"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition group-hover:opacity-100`}
                  />
                  <div className="relative space-y-4">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/70"
                    >
                      <feature.icon className={`h-6 w-6 ${feature.iconClass}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-300">{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="border-b border-white/5 bg-slate-950/20 py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1fr,1.1fr]">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-200">
                  <Globe className="h-3.5 w-3.5" />
                  A streamlined merchant journey
                </span>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  From idea to launch in one guided flow
                </h2>
                <p className="text-base text-slate-300">
                  The Reech dashboard walks you through each stage—from creating your
                  account to inviting team members and publishing to your unique
                  subdomain. No guesswork, just momentum.
                </p>
                <div className="space-y-4">
                  {[{
                    title: 'Data secured by Supabase',
                    description: 'Multi-tenant architecture keeps each store isolated, while role-based access controls manage your collaborators.',
                    icon: ShieldCheck,
                  },
                  {
                    title: 'Insights on every iteration',
                    description: 'Track engagement, conversion, and publish readiness with analytics surfaced right inside your preview.',
                    icon: LineChart,
                  }].map((item) => (
                    <div key={item.title} className="flex gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-300">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-300">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative rounded-3xl border border-white/5 bg-white/5 p-8 shadow-2xl shadow-blue-500/20">
                <div className="absolute inset-x-10 -top-6 flex items-center justify-between rounded-full border border-white/10 bg-slate-900/80 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-slate-300">
                  <span>Preview timeline</span>
                  <span className="flex items-center gap-2 text-blue-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Guided
                  </span>
                </div>
                <div className="space-y-6 pt-4">
                  {workflow.map((step, index) => (
                    <div key={step.title} className="relative pl-10">
                      {index !== workflow.length - 1 && (
                        <span className="absolute left-5 top-6 h-[calc(100%-24px)] w-px bg-gradient-to-b from-blue-500/40 to-transparent" />
                      )}
                      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-sm font-semibold text-blue-200">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Reliability */}
        <section
          id="security"
          className="border-b border-white/5 bg-gradient-to-b from-slate-950/80 to-slate-950/40 py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr,1fr]">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Security & Reliability
                </span>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                  Built on a secure, multi-tenant foundation
                </h2>
                <p className="text-base text-slate-300">
                  Reech is powered by Supabase with tenant isolation at every layer.
                  Authentication, store configs, and member access all run through RLS
                  policies and audited workflows.
                </p>

                <ul className="grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
                  {[
                    'Row-level security across every store',
                    'Role-based access control for team members',
                    'Automated backups and point-in-time recovery',
                    'Encrypted data in transit and at rest',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-6 shadow-xl shadow-emerald-500/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      Supabase session snapshot
                    </p>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">
                      protected
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300">
                    <pre className="overflow-x-auto">
{`{
  "tenant_id": "store_4f1c...",
  "members": [
    {
      "role": "owner",
      "status": "active"
    }
  ],
  "rls": true
}`}
                    </pre>
                  </div>
                  <p className="text-xs text-slate-400">
                    Store membership is enforced via Supabase RLS policies using the{' '}
                    <span className="font-semibold text-slate-200">
                      store_members
                    </span>{' '}
                    table—ensuring only authorized users access tenant data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden py-24">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-500/30 to-blue-600/30 blur-3xl" />
          <div className="relative mx-auto max-w-5xl rounded-[2.75rem] border border-white/10 bg-white/10 px-6 py-16 text-center shadow-2xl shadow-blue-500/20 sm:px-10 lg:px-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-100">
              <Rocket className="h-3.5 w-3.5" />
              Launch in days, not months
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">
              Ready to build your next storefront with Reech?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100">
              Create your account, explore the preview-first dashboard, and publish when
              everything feels perfect. Reech keeps your team moving forward together.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={primaryCta}>
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/signin" className={secondaryCta}>
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/80 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 sm:gap-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Reech</p>
              <p className="text-xs text-slate-400">
                The preview-first multi-tenant commerce platform.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <Link href="/signin" className="transition hover:text-white">
              Sign in
            </Link>
            <Link href="/signup" className="transition hover:text-white">
              Create account
            </Link>
            <Link href="/admin" className="transition hover:text-white">
              Admin console
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Reech. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
