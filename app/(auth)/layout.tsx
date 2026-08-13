import { Mascot } from "@/components/auth/mascot";

const FEATURES = [
  { label: "CRM & Contacts",    desc: "Manage leads, clients, and every interaction" },
  { label: "Deal Pipeline",     desc: "Kanban pipeline with custom stages" },
  { label: "Task Management",   desc: "Assign tasks, set priorities, track progress" },
  { label: "Stock Tracking",    desc: "Product catalog with low-stock alerts" },
  { label: "AI Bot Assistant",  desc: "Telegram & WhatsApp — natural language commands" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[44%]"
        style={{ background: "linear-gradient(145deg, #1a2a23 0%, #2B5748 55%, #618764 100%)" }}
      >
        {/* Drifting dot-grid background */}
        <div
          className="pointer-events-none absolute inset-0 animate-dotgrid-drift"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* Logo */}
        <div className="relative flex animate-auth-fade-down items-center gap-2.5 opacity-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-dark.svg" alt="Panelflo" width={32} height={32} className="rounded-xl" />
          <span className="text-xl font-bold tracking-tight text-white">Panelflo</span>
        </div>

        {/* Mascot + headline + features */}
        <div className="relative space-y-8">
          <Mascot />

          <div className="animate-auth-fade-up text-center opacity-0 [animation-delay:300ms]">
            <p className="text-2xl font-semibold leading-snug text-white">
              Run your business.
              <br />
              <span className="text-[#9CB080]">One message at a time.</span>
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map((f, i) => (
              <li
                key={f.label}
                className="flex animate-auth-fade-up items-start gap-3 opacity-0"
                style={{ animationDelay: `${450 + i * 100}ms` }}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-xs text-white/45">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/25">© 2026 Panelflo. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-2.5 text-foreground lg:hidden">
          <img src="/icon-light.svg" alt="Panelflo" width={28} height={28} className="block dark:hidden rounded-lg" />
          <img src="/icon-dark.svg" alt="Panelflo" width={28} height={28} className="hidden dark:block rounded-lg" />
          <span className="text-xl font-bold tracking-tight">Panelflo</span>
        </div>

        <div className="w-full max-w-sm animate-auth-fade-up opacity-0 [animation-delay:150ms]">
          {children}
        </div>
      </div>
    </div>
  );
}
