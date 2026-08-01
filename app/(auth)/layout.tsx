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
        className="hidden flex-col justify-between p-10 lg:flex lg:w-[44%]"
        style={{ background: "linear-gradient(145deg, #1a2a23 0%, #2B5748 55%, #618764 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <span className="text-sm font-extrabold text-white">P</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Panelflo</span>
        </div>

        {/* Quote + features */}
        <div className="space-y-8">
          <div>
            <p className="text-2xl font-semibold leading-snug text-white">
              Run your entire business<br />from one clean panel.
            </p>
            <p className="mt-3 text-sm text-white/50">
              Built for teams that move fast.
            </p>
          </div>

          <ul className="space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
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

        <p className="text-xs text-white/25">© 2026 Panelflo. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile-only logo */}
        <div className="mb-8 flex items-center gap-2.5 text-foreground lg:hidden">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ background: "linear-gradient(135deg, #2B5748 0%, #618764 100%)" }}
          >
            <span className="text-[11px] font-extrabold">P</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Panelflo</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
