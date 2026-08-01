import {
  ArrowRight,
  Bot,
  CheckSquare,
  Kanban,
  MessageCircle,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Kanban,
    title: "Pipeline CRM",
    desc: "Visualize deals across stages. Drag, drop, and close faster.",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    desc: "Linear-style task lists and kanban boards — built for teams.",
  },
  {
    icon: Bot,
    title: "AI Bot Assistant",
    desc: "Manage your CRM from Telegram or WhatsApp. Just send a message.",
  },
  {
    icon: Users,
    title: "Team Workspace",
    desc: "Invite your team, assign tasks, and track work together.",
  },
  {
    icon: MessageCircle,
    title: "Smart Notifications",
    desc: "Get alerts for overdue tasks, deal updates, and bot activity.",
  },
  {
    icon: Zap,
    title: "Automation Ready",
    desc: "Powered by n8n — automate digests, follow-ups, and more.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b bg-white/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900">
          Panelflo
          <span className="h-2 w-2 rounded-full bg-[#2B5748]" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[#2B5748] px-4 py-2 text-sm font-semibold text-white hover:bg-[#234a3d] transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2B5748]/30 bg-[#2B5748]/8 px-4 py-1.5 text-sm font-medium text-[#2B5748]">
          <Zap className="h-3.5 w-3.5" />
          AI-powered business panel
        </div>

        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl">
          Run your business
          <br />
          <span className="text-[#2B5748]">from anywhere</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500">
          CRM, tasks, pipeline, and an AI assistant that works through Telegram and
          WhatsApp. Everything your team needs in one clean panel.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-xl bg-[#2B5748] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2B5748]/25 hover:bg-[#234a3d] transition-colors"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border px-6 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Dashboard preview */}
        <div className="relative mx-auto mt-16 w-full max-w-4xl">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent to-white" />
          <div className="overflow-hidden rounded-2xl border bg-gray-50 shadow-2xl">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 border-b bg-white px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto flex h-6 w-64 items-center rounded-md bg-gray-100 px-3 text-xs text-gray-400">
                app.panelflo.com/dashboard
              </div>
            </div>
            {/* Dashboard mock */}
            <div className="grid grid-cols-4 gap-3 p-4">
              {["Tasks due today", "Open deals", "Contacts", "Overdue"].map((label, i) => (
                <div key={label} className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`mt-1 text-2xl font-bold ${i === 3 ? "text-red-600" : "text-gray-900"}`}>
                    {["4", "12 · $48k", "87", "2"][i]}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-3 px-4 pb-4">
              <div className="col-span-3 rounded-xl border bg-white p-4">
                <p className="mb-3 text-sm font-semibold">My tasks today</p>
                {["Send proposal to Acme", "Follow up with John", "Update pipeline"].map((t) => (
                  <div key={t} className="flex items-center gap-2 py-2 border-b last:border-0">
                    <div className="h-4 w-4 rounded border-2 border-gray-300" />
                    <p className="text-sm text-gray-700">{t}</p>
                  </div>
                ))}
              </div>
              <div className="col-span-2 rounded-xl border bg-white p-4">
                <p className="mb-3 text-sm font-semibold">Bot activity</p>
                {["Task created via bot", "Deal moved to WON", "Digest sent"].map((t) => (
                  <div key={t} className="flex items-start gap-2 py-2">
                    <div className="mt-1 h-5 w-5 shrink-0 rounded-full bg-[#2B5748]/15 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-[#2B5748]" />
                    </div>
                    <p className="text-xs text-gray-600">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-gray-500">
              No bloat. Just the tools that move your business forward.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2B5748]/10 transition-colors group-hover:bg-[#2B5748]/20">
                  <Icon className="h-5 w-5 text-[#2B5748]" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl rounded-3xl bg-[#2B5748] px-8 py-16 text-center text-white shadow-xl shadow-[#273338]/40">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to start?</h2>
          <p className="mt-3 text-[#9CB080]">
            Set up your workspace in minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#2B5748] shadow hover:bg-gray-50 transition-colors"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-gray-900">
            Panelflo
            <span className="h-2 w-2 rounded-full bg-[#2B5748]" />
          </div>
          <p className="text-sm text-gray-400">© 2026 Panelflo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
