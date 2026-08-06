import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, BarChart2, ListChecks, Bot, Users, Package, Bell, Zap } from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { LandingBotChat } from "@/components/landing-bot-chat";
import { LandingBotTerminal } from "@/components/landing-bot-terminal";

const CHAT_MESSAGES = [
  { role: "user", text: "Hey Flo, show me overdue tasks" },
  {
    role: "bot",
    text: "📋 2 overdue tasks:\n• Send proposal to Acme — 2 days late\n• Follow up with Sara — 1 day late",
  },
  { role: "user", text: "Move Acme deal to Won" },
  { role: "bot", text: "✅ Acme deal moved to Won. Nice close! 💪" },
  { role: "user", text: "Add contact John Doe from Globex" },
  { role: "bot", text: "✔ John Doe added. Assigned to you." },
];

const FEATURES = [
  {
    icon: BarChart2,
    title: "Pipeline CRM",
    desc: "Visualize deals across custom stages. Drag, close, and move on.",
  },
  {
    icon: ListChecks,
    title: "Task Management",
    desc: "Kanban and list views. Priorities, due dates, team assignment.",
  },
  {
    icon: Bot,
    title: "AI Bot — Flo",
    desc: "Full CRM control from Telegram or WhatsApp. Natural language commands.",
  },
  {
    icon: Users,
    title: "Team Workspace",
    desc: "Roles, invites, and shared pipeline. Everyone on the same page.",
  },
  {
    icon: Package,
    title: "Stock Tracking",
    desc: "Product catalog, low-stock alerts, movement ledger.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Overdue tasks, stale deals, morning digests — automatically sent.",
  },
];

const TESTIMONIALS = [
  {
    quote: "Flo saved us at least 2 hours a day. We run our entire pipeline from WhatsApp now — no dashboard needed.",
    name: "Leyla Mammadova",
    role: "Founder, Axon Retail",
    initials: "LM",
  },
  {
    quote: "We replaced Notion, Trello, and a separate CRM with Panelflo. One tool, one bot, zero confusion.",
    name: "Rashad Aliyev",
    role: "Sales Lead, NovaTech",
    initials: "RA",
  },
  {
    quote: "The morning digest alone is worth it. Our team shows up every day knowing exactly what to work on.",
    name: "Sara Guliyeva",
    role: "Ops Manager, CloudBase",
    initials: "SG",
  },
];

const REPLACES = [
  {
    name: "Notion", desc: "Contacts & notes", color: "#E8E8E8", bg: "#1A1A1A",
    icon: `<path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z"/>`,
  },
  {
    name: "Trello", desc: "Task boards", color: "#4EC3E0", bg: "#0C2D52",
    icon: `<path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.656 1.343 3 3 3h18c1.656 0 3-1.344 3-3V3c0-1.657-1.344-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z"/>`,
  },
  {
    name: "Asana", desc: "Project tasks", color: "#F06A6A", bg: "#3D1414",
    icon: `<path d="M11.9963 0C9.5699.002 7.3997 1.297 6.2378 3.4026c-1.185 2.125-1.185 4.7308 0 6.8559 1.162 2.1056 3.3321 3.3996 5.7585 3.4016 3.1767 0 5.7586-2.5822 5.7586-5.7588C17.7549 2.5822 15.1727 0 11.9963 0zm-6.2348 8.9218C2.5848 9.0944.0009 11.7783 0 15.0808c0 1.548.6147 3.0316 1.7087 4.124 1.0927 1.0946 2.5767 1.7097 4.1257 1.7097C9.0143 20.9178 11.597 18.3351 11.597 15.1584 11.5966 12.0297 9.123 9.4657 6.0111 9.193zm11.9685.2712c-3.1093.2741-5.581 2.8373-5.581 5.9645.0001 3.1767 2.5823 5.7587 5.7587 5.7587 1.5487 0 3.0322-.6151 4.1247-1.7097 1.0953-1.0924 1.7103-2.5763 1.71-4.1245-.0002-3.3015-2.5834-5.9851-5.7784-6.1575z"/>`,
  },
  {
    name: "HubSpot", desc: "CRM & pipeline", color: "#FF7A59", bg: "#3D1A0A",
    icon: `<path d="M18.164 7.931V5.085a2.198 2.198 0 0 0 1.266-1.978V3.04a2.198 2.198 0 0 0-2.195-2.196h-.067a2.198 2.198 0 0 0-2.196 2.196v.067a2.198 2.198 0 0 0 1.266 1.978v2.847a6.232 6.232 0 0 0-2.969 1.31L5.2 4.031a2.405 2.405 0 0 0 .07-.55 2.427 2.427 0 1 0-2.427 2.426c.437 0 .845-.12 1.197-.32l7.998 5.164a6.26 6.26 0 0 0-.08 5.508l-2.426 2.427a1.956 1.956 0 0 0-.56-.083 1.989 1.989 0 1 0 1.989 1.989c0-.2-.032-.393-.083-.577l2.398-2.398a6.261 6.261 0 0 0 8.66-2.349 6.261 6.261 0 0 0-3.772-9.337zm-1.021 9.566a3.353 3.353 0 1 1 0-6.706 3.353 3.353 0 0 1 0 6.706z"/>`,
  },
  {
    name: "Spreadsheets", desc: "Inventory tracking", color: "#34A853", bg: "#0A2A14",
    icon: `<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3h5v2h-5V6zm0 3h5v2h-5V9zm0 3h5v2h-5v-2zM7 6h4v8H7V6zm0 9h10v2H7v-2z"/>`,
  },
  {
    name: "Bot tools", desc: "Separate integrations", color: "#A78BFA", bg: "#1E1035",
    icon: `<path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2m-4.5 11a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5m9 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>`,
  },
];

const FAQ = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Every plan starts with a 14-day free trial. Just sign up and explore.",
  },
  {
    q: "Which messaging apps does the bot support?",
    a: "Telegram and WhatsApp. Connect both independently — each workspace user links their own account.",
  },
  {
    q: "Can multiple team members use the bot?",
    a: "Yes. Every team member connects their own Telegram or WhatsApp. The bot knows who's sending commands and acts on their behalf.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You can export everything before you leave. Your data is never held hostage.",
  },
  {
    q: "Is Panelflo suitable for non-technical teams?",
    a: "Absolutely. If your team can send a WhatsApp message, they can use Panelflo. No training required.",
  },
];

const BOT_EXAMPLES = [
  "List overdue tasks",
  "Create deal Globex $5k",
  "Move Acme to Won",
  "Weekly stats",
  "Add note: called John",
  "Assign task to Maya",
];

export default function LandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── NAV ── */}
      <nav className="pf-nav">
        <div className="pf-nav-inner">
          <Link href="/" className="pf-logo">
            <Image src="/icon-light.svg" alt="" width={28} height={28} style={{borderRadius:8}} />
            <span>Panelflo</span>
          </Link>
          <div className="pf-nav-links">
            <a href="#features">Features</a>
            <a href="#bot">Bot</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="pf-nav-ctas">
            <Link href="/login" className="pf-nav-signin">Sign in</Link>
            <Link href="/signup" className="pf-btn-primary pf-btn-sm">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pf-hero">
        {/* Left — editorial */}
        <div className="pf-hero-left">
          <span className="pf-badge pf-enter pf-enter-1">Telegram &amp; WhatsApp native</span>

          <h1 className="pf-hero-h1 pf-enter pf-enter-2">
            Run your business.<br />
            <em>One message at a time.</em>
          </h1>

          <p className="pf-hero-sub pf-enter pf-enter-3">
            CRM, pipeline, tasks, and inventory — managed entirely from your team's
            chat apps. No tab-switching. No dashboards to babysit.
          </p>

          <div className="pf-hero-actions pf-enter pf-enter-4">
            <Link href="/signup" className="pf-btn-primary">
              Start free <ArrowRight size={15} />
            </Link>
            <Link href="/login" className="pf-btn-ghost">Sign in</Link>
          </div>

          {/* Social proof */}
          <div className="pf-social-proof pf-enter pf-enter-5">
            <div className="pf-avatars">
              {["LM","RA","SG","KJ","BT"].map((i) => (
                <span key={i} className="pf-avatar-chip">{i}</span>
              ))}
            </div>
            <div>
              <div className="pf-stars">{"★★★★★"}</div>
              <p className="pf-social-text">Loved by 200+ teams worldwide</p>
            </div>
          </div>

          <div className="pf-platforms pf-enter pf-enter-6">
            <span className="pf-platform-label">Works natively on</span>
            <div className="pf-platform-chips">
              <span className="pf-platform-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.32l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.958.24z"/></svg>
                Telegram
              </span>
              <span className="pf-platform-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </span>
            </div>
          </div>
        </div>

        {/* Right — dark chat demo */}
        <div className="pf-hero-right">
          <div className="pf-dot-grid" aria-hidden="true" />
          <div className="pf-chat-frame pf-float">
            {/* Header */}
            <div className="pf-chat-header">
              <div className="pf-chat-avatar">
                <Image src="/icon-dark.svg" alt="Flo" width={32} height={32} />
              </div>
              <div>
                <p className="pf-chat-name">Flo Agent</p>
                <p className="pf-chat-status">
                  <span className="pf-dot" /> online
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="pf-chat-body">
              {CHAT_MESSAGES.map((m, i) => (
                <div
                  key={i}
                  className={`pf-msg pf-msg-d${i + 1} ${m.role === "user" ? "pf-msg-user" : "pf-msg-bot"}`}
                  style={{ whiteSpace: "pre-line" }}
                >
                  {m.text}
                </div>
              ))}
              <div className="pf-typing pf-msg-d7">
                <span /><span /><span />
              </div>
            </div>

            {/* Input */}
            <div className="pf-chat-input">
              <span className="pf-chat-placeholder">Message Flo…</span>
              <button className="pf-send" aria-label="Send">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="pf-features" id="features">
        <div className="pf-section-inner">
          <div className="pf-section-head">
            <p className="pf-eyebrow">What's inside</p>
            <h2 className="pf-h2">Everything your team runs on.</h2>
            <p className="pf-section-sub">
              No bloat. No feature-gating for basics. Just the tools that move deals
              and keep work moving.
            </p>
          </div>

          <div className="pf-feature-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => {
              const isHero = title === "AI Bot — Flo";
              return (
                <div key={title} className={`pf-feature-card${isHero ? " pf-feature-card-hero" : ""}`}>
                  <div className="pf-feature-icon">
                    <Icon size={20} />
                  </div>
                  <h3 className="pf-feature-title">{title}</h3>
                  <p className="pf-feature-desc">{desc}</p>
                  {isHero && (
                    <div className="pf-feature-hero-badge">
                      <span className="pf-dot" /> AI-powered
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BOT SECTION ── */}
      <section className="pf-bot-section" id="bot">
        <div className="pf-section-inner">
          <div className="pf-bot-inner">
            <div className="pf-bot-copy">
              <p className="pf-eyebrow pf-eyebrow-sage">The bot</p>
              <h2 className="pf-h2 pf-h2-light">
                Your CRM,<br />inside your chat.
              </h2>
              <p className="pf-section-sub pf-sub-light">
                Flo understands natural language. No slash commands to memorize.
                Just tell it what you need — in any language.
              </p>
              <div className="pf-bot-checks">
                {[
                  "Works in Telegram & WhatsApp",
                  "Replies in your language",
                  "Manages contacts, tasks & deals",
                  "Sends morning digests automatically",
                ].map((c) => (
                  <div key={c} className="pf-check-row">
                    <Check size={14} className="pf-check-icon" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="pf-btn-primary" style={{marginTop:8}}>
                Try it free <ArrowRight size={14} />
              </Link>
            </div>

            <LandingBotTerminal examples={BOT_EXAMPLES} />
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pf-pricing" id="pricing">
        <div className="pf-section-inner">
          <div className="pf-section-head pf-section-head-center">
            <p className="pf-eyebrow">Pricing</p>
            <h2 className="pf-h2">Simple, honest pricing.</h2>
            <p className="pf-section-sub">
              14-day free trial on every plan. No credit card required to start.
            </p>
          </div>

          <div className="pf-plan-grid">
            {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => {
              const popular = key === "growth";
              return (
                <div key={key} className={`pf-plan-card${popular ? " pf-plan-popular" : ""}`}>
                  {popular && (
                    <div className="pf-plan-badge">
                      <Zap size={11} /> Most popular
                    </div>
                  )}
                  <div className="pf-plan-header">
                    <p className="pf-plan-name">{plan.name}</p>
                    <div className="pf-plan-price">
                      <span className="pf-plan-dollar">$</span>
                      <span className="pf-plan-amount">{plan.price}</span>
                      <span className="pf-plan-per">/mo</span>
                    </div>
                  </div>
                  <ul className="pf-plan-features">
                    {plan.features.map((f) => (
                      <li key={f} className="pf-plan-feat">
                        <Check size={13} className="pf-plan-check" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={popular ? "pf-btn-primary pf-plan-cta" : "pf-btn-ghost pf-plan-cta"}
                  >
                    Start free trial <ArrowRight size={13} />
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="pf-pricing-note">
            All plans include a 14-day trial · Cancel anytime · No setup fees
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="pf-testimonials">
        <div className="pf-section-inner">
          <div className="pf-section-head pf-section-head-center">
            <p className="pf-eyebrow">Testimonials</p>
            <h2 className="pf-h2">Teams love Panelflo.</h2>
          </div>
          <div className="pf-testi-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="pf-testi-card">
                <p className="pf-testi-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="pf-testi-author">
                  <span className="pf-testi-avatar">{t.initials}</span>
                  <div>
                    <p className="pf-testi-name">{t.name}</p>
                    <p className="pf-testi-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REPLACES ── */}
      <section className="pf-replaces-sec">
        <div className="pf-section-inner">
          <div className="pf-replaces-inner">
            <div className="pf-replaces-copy">
              <p className="pf-eyebrow">One tool instead of many</p>
              <h2 className="pf-h2">Panelflo replaces your entire stack.</h2>
              <p className="pf-section-sub">
                Stop paying for six tools that don&apos;t talk to each other.
                Everything your team needs, under one roof.
              </p>
              <Link href="/signup" className="pf-btn-primary" style={{marginTop:28}}>
                Consolidate now <ArrowRight size={14} />
              </Link>
            </div>

            <div className="pf-replaces-grid">
              {REPLACES.map((r) => (
                <div key={r.name} className="pf-replaces-card">
                  <div
                    className="pf-replaces-icon"
                    style={{ background: r.bg }}
                  >
                    <svg
                      width="18" height="18" viewBox="0 0 24 24"
                      fill={r.color}
                      dangerouslySetInnerHTML={{ __html: r.icon }}
                    />
                  </div>
                  <div className="pf-replaces-info">
                    <p className="pf-replaces-name">{r.name}</p>
                    <p className="pf-replaces-desc">{r.desc}</p>
                  </div>
                  <span className="pf-replaces-badge">✕</span>
                </div>
              ))}

              {/* Replaced by row */}
              <div className="pf-replaces-by">
                <Image src="/icon-light.svg" alt="Panelflo" width={22} height={22} style={{borderRadius:6}} />
                <span>All replaced by <strong>Panelflo</strong></span>
                <span className="pf-replaces-check">✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pf-faq-sec">
        <div className="pf-section-inner pf-faq-inner">
          <div className="pf-section-head">
            <p className="pf-eyebrow">FAQ</p>
            <h2 className="pf-h2">Common questions.</h2>
          </div>
          <div className="pf-faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="pf-faq-item">
                <summary className="pf-faq-q">
                  {item.q}
                  <span className="pf-faq-chevron" aria-hidden="true">›</span>
                </summary>
                <p className="pf-faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pf-cta">
        <div className="pf-section-inner pf-cta-inner">
          <p className="pf-eyebrow">Ready?</p>
          <h2 className="pf-cta-h2">Your workspace is waiting.</h2>
          <p className="pf-cta-sub">
            Set up in minutes. No credit card. No sales call.
          </p>
          <Link href="/signup" className="pf-btn-primary pf-btn-lg">
            Create free workspace <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pf-footer">
        <div className="pf-footer-inner">
          <div className="pf-logo">
            <Image src="/icon-light.svg" alt="" width={22} height={22} style={{borderRadius:6}} />
            <span>Panelflo</span>
          </div>
          <p className="pf-footer-copy">© 2026 Panelflo. All rights reserved.</p>
          <div className="pf-footer-links">
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const STYLES = `
  /* ── Tokens ── */
  :root {
    --bg:       #F6F9F7;
    --surface:  #FFFFFF;
    --border:   #D8E6DE;
    --text:     #0C1C12;
    --muted:    #4E6A58;
    --forest:   #2DC876;
    --forest-h: #25AE65;
    --sage:     #7EE2A2;
    --sage-h:   #66D48E;
    --dark-bg:  #0C1210;
    --dark-s:   #131A16;
    --dark-b:   #1C2A22;
    --dark-t:   #D6EDE0;
    --dark-m:   #4E7A60;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg:      #0C1210;
      --surface: #131A16;
      --border:  #1C2A22;
      --text:    #D6EDE0;
      --muted:   #4E7A60;
    }
  }
  :root[data-theme="dark"] {
    --bg:      #0C1210;
    --surface: #131A16;
    --border:  #1C2A22;
    --text:    #D6EDE0;
    --muted:   #4E7A60;
  }
  :root[data-theme="light"] {
    --bg:      #F6F9F7;
    --surface: #FFFFFF;
    --border:  #D8E6DE;
    --text:    #0C1C12;
    --muted:   #4E6A58;
  }

  /* ── Base ── */
  .pf-nav, .pf-hero, .pf-features, .pf-bot-section, .pf-pricing,
  .pf-testimonials, .pf-replaces-sec, .pf-faq-sec,
  .pf-cta, .pf-footer { font-family: var(--font-sans, system-ui, sans-serif); }

  /* ── Nav ── */
  .pf-nav {
    position: fixed; left: 0; right: 0; top: 0; z-index: 50;
    width: 100%;
    background: color-mix(in srgb, var(--bg) 80%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .pf-nav-inner {
    max-width: 1160px; margin: 0 auto;
    display: flex; align-items: center; gap: 32px;
    padding: 0 24px; height: 60px;
  }
  .pf-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: var(--text);
    text-decoration: none; letter-spacing: -0.02em;
  }
  .pf-logo-light { display: block; border-radius: 8px; }
  .pf-logo-dark  { display: none;  border-radius: 8px; }
  @media (prefers-color-scheme: dark) {
    .pf-logo-light { display: none; }
    .pf-logo-dark  { display: block; }
  }
  :root[data-theme="dark"] .pf-logo-light { display: none; }
  :root[data-theme="dark"] .pf-logo-dark  { display: block; }
  :root[data-theme="light"] .pf-logo-light { display: block; }
  :root[data-theme="light"] .pf-logo-dark  { display: none; }

  .pf-nav-links {
    display: flex; gap: 24px; margin-left: 8px;
  }
  .pf-nav-links a {
    font-size: 14px; font-weight: 500; color: var(--muted);
    text-decoration: none; transition: color 0.15s;
  }
  .pf-nav-links a:hover { color: var(--text); }
  .pf-nav-ctas { display: flex; align-items: center; gap: 12px; margin-left: auto; }
  .pf-nav-signin {
    font-size: 14px; font-weight: 500; color: var(--muted);
    text-decoration: none; transition: color 0.15s;
  }
  .pf-nav-signin:hover { color: var(--text); }

  @media (max-width: 640px) {
    .pf-nav-links { display: none; }
    .pf-nav-signin { display: none; }
  }

  /* ── Buttons ── */
  .pf-btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--forest); color: #fff;
    font-size: 14px; font-weight: 600; border-radius: 10px;
    padding: 10px 20px; text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
    box-shadow: 0 2px 12px color-mix(in srgb, var(--forest) 30%, transparent);
  }
  .pf-btn-primary:hover { background: var(--forest-h); }
  .pf-btn-sm  { padding: 8px 16px; font-size: 13px; border-radius: 8px; }
  .pf-btn-lg  { padding: 14px 28px; font-size: 15px; border-radius: 12px; }

  .pf-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: var(--muted);
    font-size: 14px; font-weight: 500; border-radius: 10px;
    padding: 10px 20px; text-decoration: none;
    border: 1px solid var(--border);
    transition: background 0.15s, color 0.15s;
  }
  .pf-btn-ghost:hover { background: var(--surface); color: var(--text); }

  .pf-btn-sage {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--sage); color: #111916;
    font-size: 14px; font-weight: 600; border-radius: 10px;
    padding: 11px 22px; text-decoration: none;
    transition: background 0.15s;
  }
  .pf-btn-sage:hover { background: var(--sage-h); }

  /* ── Hero ── */
  .pf-hero {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    background: linear-gradient(90deg, var(--bg) 50%, #0C1210 50%);
    position: relative;
    overflow: hidden;
  }
  .pf-hero::before {
    content: "";
    position: absolute; left: 0; right: 0; top: 0; bottom: 0;
    background: radial-gradient(ellipse 100% 55% at 50% -5%, color-mix(in srgb, var(--forest) 25%, transparent), transparent);
    pointer-events: none;
    z-index: 0;
  }
  .pf-hero-left  { position: relative; z-index: 1; }
  .pf-hero-right { position: relative; z-index: 1; background: transparent; }
  @media (max-width: 900px) {
    .pf-hero { grid-template-columns: 1fr; }
    .pf-hero-right { display: none; }
  }

  .pf-hero-left {
    display: flex; flex-direction: column; justify-content: center;
    padding: 120px 64px 80px;
    max-width: 600px;
  }
  @media (max-width: 1100px) { .pf-hero-left { padding: 120px 40px 80px; } }
  @media (max-width: 900px)  { .pf-hero-left { padding: 100px 24px 60px; max-width: 100%; } }

  .pf-badge {
    display: inline-flex; align-items: center;
    background: color-mix(in srgb, var(--sage) 15%, transparent);
    color: var(--sage); border: 1px solid color-mix(in srgb, var(--sage) 35%, transparent);
    font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase; border-radius: 100px;
    padding: 5px 12px; margin-bottom: 28px;
    width: fit-content;
  }

  .pf-hero-h1 {
    font-size: clamp(36px, 4.5vw, 58px);
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.04em;
    color: var(--text);
    text-wrap: balance;
    margin: 0 0 20px;
  }
  .pf-hero-h1 em {
    font-style: normal;
    color: var(--forest);
  }

  .pf-hero-sub {
    font-size: 17px; line-height: 1.65;
    color: var(--muted); margin: 0 0 36px;
    max-width: 460px;
  }

  .pf-hero-actions {
    display: flex; align-items: center; gap: 12px; margin-bottom: 48px;
    flex-wrap: wrap;
  }

  .pf-platforms {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    padding-top: 28px; border-top: 1px solid var(--border);
  }
  .pf-platform-label {
    font-size: 12px; color: var(--muted); font-weight: 500; white-space: nowrap;
  }
  .pf-platform-chips { display: flex; gap: 8px; }
  .pf-platform-chip {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; color: var(--text);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 100px; padding: 6px 14px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pf-platform-chip:hover {
    border-color: var(--forest);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--forest) 15%, transparent);
  }

  /* ── Chat panel ── */
  .pf-hero-right {
    display: flex; align-items: center; justify-content: center;
    padding: 80px 40px;
    position: relative;
    overflow: hidden;
  }

  .pf-chat-frame {
    background: #131A16;
    border: 1px solid #1C2A22;
    border-radius: 18px;
    width: 100%; max-width: 360px;
    display: flex; flex-direction: column;
    overflow: hidden;
    box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,200,118,0.1);
    position: relative; z-index: 1;
  }

  .pf-chat-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid #1C2A22;
    background: #131A16;
  }
  .pf-chat-avatar {
    width: 36px; height: 36px; border-radius: 10px;
    overflow: hidden; background: transparent;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pf-chat-name { font-size: 14px; font-weight: 600; color: #D6EDE0; line-height: 1; }
  .pf-chat-status { font-size: 11px; color: #4E7A60; margin-top: 3px;
    display: flex; align-items: center; gap: 5px; }
  .pf-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #4ade80; display: inline-block;
    box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
  }

  .pf-chat-body {
    padding: 16px; display: flex; flex-direction: column; gap: 8px;
    min-height: 280px;
    background: #0F1712;
  }

  /* Chat bubble animation */
  @keyframes pf-msg-in {
    from { opacity: 0; transform: translateY(6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .pf-msg {
    opacity: 0;
    animation: pf-msg-in 0.3s cubic-bezier(0.2, 0, 0.2, 1) forwards;
    max-width: 85%; font-size: 13px; line-height: 1.5;
    padding: 9px 13px; border-radius: 14px;
  }
  .pf-msg-user {
    background: var(--forest); color: #fff;
    align-self: flex-end; border-bottom-right-radius: 4px;
    box-shadow: 0 2px 12px color-mix(in srgb, var(--forest) 40%, transparent);
  }
  .pf-msg-bot {
    background: #1A2820; color: #D6EDE0; border: 1px solid #223A2C;
    align-self: flex-start; border-bottom-left-radius: 4px;
  }
  .pf-msg-d1 { animation-delay: 0.4s; }
  .pf-msg-d2 { animation-delay: 1.2s; }
  .pf-msg-d3 { animation-delay: 2.4s; }
  .pf-msg-d4 { animation-delay: 3.2s; }
  .pf-msg-d5 { animation-delay: 4.2s; }
  .pf-msg-d6 { animation-delay: 5.0s; }
  .pf-msg-d7 { animation-delay: 5.8s; }

  @keyframes pf-blink { 0%,100%{opacity:1;} 50%{opacity:0.2;} }
  .pf-typing {
    opacity: 0;
    animation: pf-msg-in 0.3s ease forwards var(--d, 5.8s);
    display: flex; gap: 4px; align-items: center;
    padding: 10px 14px; border-radius: 14px; border-bottom-left-radius: 4px;
    background: #1A2820; border: 1px solid #223A2C;
    align-self: flex-start; width: fit-content;
  }
  .pf-typing span {
    width: 5px; height: 5px; border-radius: 50%;
    background: #4E7A60; display: block;
    animation: pf-blink 1.2s ease-in-out infinite;
  }
  .pf-typing span:nth-child(2) { animation-delay: 0.2s; }
  .pf-typing span:nth-child(3) { animation-delay: 0.4s; }

  .pf-chat-input {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px; border-top: 1px solid #1C2A22;
    background: #131A16;
  }
  .pf-chat-placeholder {
    flex: 1; font-size: 13px; color: #3D6048;
  }
  .pf-send {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--forest); color: #fff; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .pf-msg, .pf-typing { opacity: 1; animation: none; }
  }

  /* ── Features ── */
  .pf-features {
    background: var(--bg);
    padding: 100px 24px;
    border-top: 1px solid var(--border);
  }
  .pf-section-inner { max-width: 1100px; margin: 0 auto; }

  .pf-section-head { margin-bottom: 60px; max-width: 560px; }
  .pf-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--forest);
    margin-bottom: 12px; display: block;
  }
  .pf-eyebrow-sage { color: var(--sage); }
  .pf-h2 {
    font-size: clamp(28px, 3vw, 40px); font-weight: 800;
    letter-spacing: -0.035em; line-height: 1.1;
    color: var(--text); margin: 0 0 14px; text-wrap: balance;
  }
  .pf-h2-light { color: #E8F0E4; }
  .pf-section-sub { font-size: 16px; line-height: 1.6; color: var(--muted); margin: 0; }
  .pf-sub-light { color: color-mix(in srgb, #E8F0E4 65%, transparent); }

  .pf-feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 768px) { .pf-feature-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 480px) { .pf-feature-grid { grid-template-columns: 1fr; } }

  .pf-feature-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 32px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.22s cubic-bezier(0.2,0,0.2,1);
  }
  .pf-feature-card::before {
    content: "";
    position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--forest), transparent);
    opacity: 0; transition: opacity 0.3s;
  }
  .pf-feature-card:hover {
    border-color: color-mix(in srgb, var(--forest) 40%, var(--border));
    box-shadow: 0 16px 48px color-mix(in srgb, var(--forest) 10%, rgba(0,0,0,0.14));
    transform: translateY(-5px);
  }
  .pf-feature-card:hover::before { opacity: 1; }

  /* AI Bot hero card — dark treatment */
  .pf-feature-card-hero {
    background: #0F1A14;
    border-color: color-mix(in srgb, var(--forest) 30%, #1C2A22);
    grid-column: span 1;
  }
  .pf-feature-card-hero .pf-feature-title { color: #E8F0E4; }
  .pf-feature-card-hero .pf-feature-desc  { color: #4E7A60; }
  .pf-feature-card-hero .pf-feature-icon  {
    background: color-mix(in srgb, var(--forest) 18%, transparent);
    border-color: color-mix(in srgb, var(--forest) 28%, transparent);
  }
  .pf-feature-card-hero:hover {
    border-color: var(--forest);
    box-shadow: 0 16px 48px color-mix(in srgb, var(--forest) 22%, rgba(0,0,0,0.4));
  }
  .pf-feature-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    margin-top: 20px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
    color: var(--forest);
    background: color-mix(in srgb, var(--forest) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--forest) 22%, transparent);
    border-radius: 100px; padding: 4px 10px; width: fit-content;
  }

  .pf-feature-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: color-mix(in srgb, var(--forest) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--forest) 18%, transparent);
    color: var(--forest);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .pf-feature-title {
    font-size: 16px; font-weight: 700; color: var(--text);
    letter-spacing: -0.025em; margin: 0 0 10px;
  }
  .pf-feature-desc { font-size: 14px; line-height: 1.6; color: var(--muted); margin: 0; }

  /* ── Bot section ── */
  .pf-bot-section {
    background: #0C1210;
    padding: 100px 24px;
    position: relative; overflow: hidden;
  }
  .pf-bot-section::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--sage), transparent);
  }

  .pf-bot-inner {
    display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
    align-items: center;
  }
  @media (max-width: 860px) {
    .pf-bot-inner { grid-template-columns: 1fr; gap: 48px; }
  }

  .pf-bot-copy {}
  .pf-bot-checks { display: flex; flex-direction: column; gap: 12px; margin: 28px 0 36px; }
  .pf-check-row {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 500;
    color: color-mix(in srgb, #E8F0E4 75%, transparent);
  }
  .pf-check-icon { color: var(--sage); flex-shrink: 0; }

  /* ── Bot terminal ── */
  .pf-term {
    background: #090E0B;
    border: 1px solid #1A2A1E;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(45,200,118,0.07);
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
  }
  .pf-term-bar {
    display: flex; align-items: center; gap: 7px;
    padding: 12px 16px;
    background: #111810;
    border-bottom: 1px solid #1A2A1E;
  }
  .pf-term-dot {
    width: 11px; height: 11px; border-radius: 50%;
  }
  .pf-term-red    { background: #FF5F57; }
  .pf-term-yellow { background: #FEBC2E; }
  .pf-term-green  { background: #28C840; }
  .pf-term-title {
    font-size: 11px; color: #3E5A46; letter-spacing: 0.02em;
    margin-left: 6px;
  }
  .pf-term-body {
    padding: 20px; min-height: 240px; max-height: 300px;
    overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
    scrollbar-width: thin; scrollbar-color: #1C2A22 transparent;
  }
  .pf-term-info {
    font-size: 11px; color: #2E4A38; margin: 0 0 12px;
    letter-spacing: 0.02em;
  }
  .pf-term-line {
    display: flex; align-items: flex-start; gap: 8px;
  }
  .pf-term-ps {
    color: var(--forest); font-size: 13px; line-height: 1.6;
    flex-shrink: 0; user-select: none;
  }
  .pf-term-cmd {
    font-size: 13px; color: #D6EDE0; line-height: 1.6;
  }
  .pf-term-output {
    font-size: 12.5px; color: #5A9470; line-height: 1.7;
    padding-left: 20px; margin: 2px 0 10px;
  }
  @keyframes pf-blink-cursor {
    0%, 100% { opacity: 1; } 50% { opacity: 0; }
  }
  .pf-term-cursor {
    display: inline-block; width: 8px; height: 14px;
    background: var(--forest); border-radius: 1px; vertical-align: middle;
    animation: pf-blink-cursor 0.9s step-end infinite;
  }
  .pf-term-examples {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 12px 16px; border-top: 1px solid #1A2A1E;
    background: #0C1410;
  }
  .pf-term-chip {
    font-size: 11px; font-weight: 500;
    color: #5A9470; background: transparent;
    border: 1px solid #1A2A1E; border-radius: 6px;
    padding: 4px 10px; cursor: pointer;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .pf-term-chip:hover:not(:disabled) {
    background: color-mix(in srgb, var(--forest) 10%, transparent);
    border-color: color-mix(in srgb, var(--forest) 35%, transparent);
    color: var(--forest);
  }
  .pf-term-chip:disabled { opacity: 0.4; cursor: default; }
  .pf-term-input-row {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; border-top: 1px solid #1A2A1E;
    background: #111810;
  }
  .pf-term-ps-input { line-height: 1; }
  .pf-term-input {
    flex: 1; background: transparent; border: none; outline: none;
    font-size: 13px; color: #D6EDE0;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    caret-color: var(--forest);
  }
  .pf-term-input::placeholder { color: #2E4A38; }
  .pf-term-input:disabled { opacity: 0.5; }
  .pf-term-send {
    width: 28px; height: 28px; border-radius: 7px;
    background: var(--forest); color: #fff; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, opacity 0.15s;
  }
  .pf-term-send:disabled { opacity: 0.35; cursor: default; }

  /* ── Pricing ── */
  .pf-pricing {
    background: var(--bg);
    padding: 100px 24px;
    border-top: 1px solid var(--border);
  }
  .pf-section-head-center { text-align: center; max-width: 100%; }
  .pf-section-head-center .pf-section-sub { margin: 0 auto; }

  .pf-plan-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 52px;
  }
  @media (max-width: 860px) { .pf-plan-grid { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; } }

  .pf-plan-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 32px 28px 28px;
    display: flex; flex-direction: column; gap: 0;
    position: relative;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .pf-plan-card:hover {
    box-shadow: 0 12px 32px rgba(0,0,0,0.08);
    transform: translateY(-3px);
  }
  .pf-plan-popular {
    border-color: var(--forest);
    box-shadow: 0 0 0 1px var(--forest), 0 8px 32px color-mix(in srgb, var(--forest) 15%, transparent);
  }
  .pf-plan-popular:hover {
    box-shadow: 0 0 0 1px var(--forest), 0 16px 48px color-mix(in srgb, var(--forest) 20%, transparent);
  }

  .pf-plan-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--forest); color: #fff;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
    padding: 4px 10px; border-radius: 100px;
    margin-bottom: 18px; width: fit-content;
  }

  .pf-plan-header { margin-bottom: 24px; }
  .pf-plan-name {
    font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--muted);
    margin-bottom: 10px;
  }
  .pf-plan-price {
    display: flex; align-items: flex-end; gap: 2px; line-height: 1;
  }
  .pf-plan-dollar { font-size: 20px; font-weight: 700; color: var(--text); align-self: flex-start; margin-top: 6px; }
  .pf-plan-amount {
    font-size: 52px; font-weight: 800; letter-spacing: -0.04em;
    color: var(--text); font-variant-numeric: tabular-nums; line-height: 1;
  }
  .pf-plan-per { font-size: 14px; color: var(--muted); margin-bottom: 6px; }

  .pf-plan-features {
    list-style: none; margin: 0 0 28px; padding: 0;
    display: flex; flex-direction: column; gap: 12px;
    flex: 1;
  }
  .pf-plan-feat {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; color: var(--text); line-height: 1.4;
  }
  .pf-plan-check { color: var(--forest); flex-shrink: 0; }

  .pf-plan-cta {
    width: 100%; justify-content: center;
    padding: 11px 20px; border-radius: 10px;
    font-size: 14px;
  }

  .pf-pricing-note {
    text-align: center; margin-top: 32px;
    font-size: 13px; color: var(--muted);
  }

  @supports (animation-timeline: view()) {
    .pf-plan-grid {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }

  /* ── CTA ── */
  .pf-cta {
    background: var(--bg);
    padding: 120px 24px;
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .pf-cta-inner { display: flex; flex-direction: column; align-items: center; gap: 0; }
  .pf-cta-h2 {
    font-size: clamp(36px, 5vw, 64px); font-weight: 800;
    letter-spacing: -0.045em; line-height: 1.0;
    color: var(--text); margin: 8px 0 16px; text-wrap: balance;
  }
  .pf-cta-sub { font-size: 16px; color: var(--muted); margin: 0 0 36px; }

  /* ── Footer ── */
  .pf-footer {
    background: var(--bg);
    border-top: 1px solid var(--border);
    padding: 28px 24px;
  }
  .pf-footer-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    flex-wrap: wrap;
  }
  .pf-footer-copy { font-size: 13px; color: var(--muted); margin: 0; }
  .pf-footer-links {
    display: flex; gap: 20px;
  }
  .pf-footer-links a {
    font-size: 13px; color: var(--muted); text-decoration: none;
    transition: color 0.15s;
  }
  .pf-footer-links a:hover { color: var(--text); }

  /* ── Animations ── */

  /* 1. Hero entrance — staggered fade-up */
  @keyframes pf-enter {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pf-enter {
    opacity: 0;
    animation: pf-enter 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .pf-enter-1 { animation-delay: 0.05s; }
  .pf-enter-2 { animation-delay: 0.18s; }
  .pf-enter-3 { animation-delay: 0.30s; }
  .pf-enter-4 { animation-delay: 0.42s; }
  .pf-enter-5 { animation-delay: 0.54s; }
  .pf-enter-6 { animation-delay: 0.66s; }

  /* ── Social proof strip ── */
  .pf-social-proof {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 36px;
  }
  .pf-avatars {
    display: flex;
  }
  .pf-avatar-chip {
    width: 30px; height: 30px; border-radius: 50%;
    background: color-mix(in srgb, var(--forest) 20%, var(--surface));
    color: var(--forest); font-size: 10px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--bg);
    margin-right: -8px; position: relative;
  }
  .pf-stars { font-size: 13px; color: #f0b429; letter-spacing: 1px; line-height: 1; }
  .pf-social-text { font-size: 12px; color: var(--muted); margin: 3px 0 0; }

  /* 2. Chat frame floating bob */
  @keyframes pf-float {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }
  .pf-float {
    animation: pf-float 5s ease-in-out infinite;
  }

  /* 3. Glow pulse */
  @keyframes pf-glow-pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.6; }
  }
  .pf-hero::before {
    animation: pf-glow-pulse 6s ease-in-out infinite;
  }

  /* 4. Dot grid on hero right */
  .pf-dot-grid {
    position: absolute; inset: 0; pointer-events: none; z-index: 0;
    background-image: radial-gradient(circle, rgba(45,200,118,0.12) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
  }

  /* 6. Scroll-driven reveal — feature cards & bot section */
  @supports (animation-timeline: view()) {
    @keyframes pf-scroll-reveal {
      from { opacity: 0; transform: translateY(28px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pf-feature-grid {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
    .pf-bot-inner {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
    .pf-cta-inner {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 40%;
    }
  }

  /* 7. Primary button shimmer on hover */
  .pf-btn-primary {
    overflow: hidden;
    position: relative;
  }
  .pf-btn-primary::after {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
    transform: translateX(-100%);
    transition: transform 0.4s ease;
  }
  .pf-btn-primary:hover::after {
    transform: translateX(100%);
  }

  /* 8. Nav link underline slide */
  .pf-nav-links a {
    position: relative;
  }
  .pf-nav-links a::after {
    content: "";
    position: absolute; bottom: -2px; left: 0; right: 0;
    height: 1px; background: var(--forest);
    transform: scaleX(0); transform-origin: left;
    transition: transform 0.2s ease;
  }
  .pf-nav-links a:hover::after { transform: scaleX(1); }

  /* 9. Online dot pulse */
  @keyframes pf-dot-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
    50%      { box-shadow: 0 0 0 4px rgba(74,222,128,0); }
  }
  .pf-dot { animation: pf-dot-pulse 2s ease-in-out infinite; }

  /* ── Testimonials ── */
  .pf-testimonials {
    background: var(--bg);
    padding: 100px 24px;
    border-top: 1px solid var(--border);
  }
  .pf-testi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 52px;
  }
  @media (max-width: 860px) { .pf-testi-grid { grid-template-columns: 1fr; } }

  .pf-testi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 32px 28px;
    display: flex; flex-direction: column; gap: 28px;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .pf-testi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.08);
  }
  .pf-testi-quote {
    font-size: 15px; line-height: 1.65; color: var(--text);
    margin: 0; flex: 1;
    font-style: italic;
  }
  .pf-testi-author {
    display: flex; align-items: center; gap: 12px;
  }
  .pf-testi-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: color-mix(in srgb, var(--forest) 15%, var(--surface));
    color: var(--forest); font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; border: 2px solid var(--border);
  }
  .pf-testi-name { font-size: 14px; font-weight: 700; color: var(--text); margin: 0; }
  .pf-testi-role { font-size: 12px; color: var(--muted); margin: 2px 0 0; }

  @supports (animation-timeline: view()) {
    .pf-testi-grid {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }

  /* ── Replaces section ── */
  .pf-replaces-sec {
    background: #0C1210;
    padding: 100px 24px;
    border-top: 1px solid #1C2A22;
    position: relative; overflow: hidden;
  }
  .pf-replaces-sec::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--forest), transparent);
  }
  .pf-replaces-inner {
    display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
    align-items: center;
  }
  @media (max-width: 860px) {
    .pf-replaces-inner { grid-template-columns: 1fr; gap: 48px; }
  }
  .pf-replaces-copy .pf-h2 { color: #E8F0E4; }
  .pf-replaces-copy .pf-section-sub { color: color-mix(in srgb, #E8F0E4 55%, transparent); }
  .pf-replaces-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 480px) { .pf-replaces-grid { grid-template-columns: 1fr; } }

  .pf-replaces-card {
    display: flex; align-items: center; gap: 12px;
    background: #111810; border: 1px solid #1C2A22;
    border-radius: 14px; padding: 14px 16px;
    position: relative;
    transition: border-color 0.15s;
  }
  .pf-replaces-card:hover { border-color: #2C3A2E; }

  .pf-replaces-icon {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pf-replaces-info { flex: 1; min-width: 0; }
  .pf-replaces-name {
    font-size: 13px; font-weight: 700;
    color: color-mix(in srgb, #D6EDE0 70%, transparent);
    margin: 0 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    text-decoration: line-through;
    text-decoration-color: rgba(239,68,68,0.4);
  }
  .pf-replaces-desc {
    font-size: 11px; color: #2E4A38; margin: 0;
  }
  .pf-replaces-badge {
    font-size: 10px; font-weight: 700; color: #ef4444;
    background: rgba(239,68,68,0.15);
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .pf-replaces-by {
    grid-column: span 2;
    display: flex; align-items: center; gap: 10px;
    background: color-mix(in srgb, var(--forest) 10%, #0A1510);
    border: 1px solid color-mix(in srgb, var(--forest) 25%, transparent);
    border-radius: 14px; padding: 14px 18px;
    font-size: 14px; color: #D6EDE0; font-weight: 500;
  }
  .pf-replaces-by strong { color: var(--forest); }
  .pf-replaces-check {
    margin-left: auto; font-size: 16px;
    color: var(--forest); font-weight: 700;
  }

  @supports (animation-timeline: view()) {
    .pf-replaces-inner {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }

  /* ── FAQ ── */
  .pf-faq-sec {
    background: var(--bg);
    padding: 100px 24px;
    border-top: 1px solid var(--border);
  }
  .pf-faq-inner {
    display: grid; grid-template-columns: 320px 1fr; gap: 80px;
    align-items: flex-start;
  }
  @media (max-width: 860px) {
    .pf-faq-inner { grid-template-columns: 1fr; gap: 40px; }
  }
  .pf-faq-list {
    display: flex; flex-direction: column; gap: 0;
  }
  .pf-faq-item {
    border-bottom: 1px solid var(--border);
  }
  .pf-faq-item:first-child { border-top: 1px solid var(--border); }
  .pf-faq-q {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 20px 0; cursor: pointer;
    font-size: 15px; font-weight: 600; color: var(--text);
    list-style: none; user-select: none;
  }
  .pf-faq-q::-webkit-details-marker { display: none; }
  .pf-faq-chevron {
    font-size: 20px; color: var(--muted); transition: transform 0.2s;
    display: inline-block; flex-shrink: 0; line-height: 1;
  }
  details[open] .pf-faq-chevron { transform: rotate(90deg); }
  .pf-faq-a {
    font-size: 14px; line-height: 1.7; color: var(--muted);
    margin: 0 0 20px; padding-right: 32px;
  }

  @supports (animation-timeline: view()) {
    .pf-faq-list {
      animation: pf-scroll-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 30%;
    }
  }

  /* Reduced motion override */
  @media (prefers-reduced-motion: reduce) {
    .pf-enter, .pf-float, .pf-dot, .pf-btn-primary::after { animation: none; opacity: 1; }
    .pf-hero::before { animation: none; }
  }
`;

