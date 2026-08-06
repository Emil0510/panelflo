import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Zap } from "lucide-react";
import { PLANS } from "@/lib/stripe";

export const metadata = { title: "Pricing — Panelflo" };

export default function PricingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Nav */}
      <nav className="pr-nav">
        <div className="pr-nav-inner">
          <Link href="/" className="pr-logo">
            <Image src="/icon-light.svg" alt="" width={26} height={26} style={{ borderRadius: 7 }} />
            <span>Panelflo</span>
          </Link>
          <div className="pr-nav-right">
            <Link href="/#features" className="pr-nav-link">Features</Link>
            <Link href="/#bot" className="pr-nav-link">Bot</Link>
            <Link href="/login" className="pr-nav-link">Sign in</Link>
            <Link href="/signup" className="pr-btn-primary pr-btn-sm">
              Get started <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="pr-main">
        {/* Header */}
        <div className="pr-hero pr-enter pr-enter-1">
          <p className="pr-eyebrow">Pricing</p>
          <h1 className="pr-h1">Simple, honest pricing.</h1>
          <p className="pr-sub">
            14-day free trial on every plan. No credit card required.<br />
            Cancel anytime — no lock-ins, no surprises.
          </p>
        </div>

        {/* Plan grid */}
        <div className="pr-grid pr-enter pr-enter-2">
          {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => {
            const popular = key === "growth";
            return (
              <div key={key} className={`pr-card${popular ? " pr-popular" : ""}`}>
                {popular && (
                  <div className="pr-popular-badge">
                    <Zap size={11} /> Most popular
                  </div>
                )}
                <div className="pr-card-top">
                  <p className="pr-plan-name">{plan.name}</p>
                  <div className="pr-price">
                    <span className="pr-dollar">$</span>
                    <span className="pr-amount">{plan.price}</span>
                    <span className="pr-period">/mo</span>
                  </div>
                  <p className="pr-billed">Billed monthly</p>
                </div>

                <ul className="pr-features">
                  {plan.features.map((f) => (
                    <li key={f} className="pr-feat">
                      <Check size={13} className="pr-check" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={popular ? "pr-btn-primary pr-cta" : "pr-btn-ghost pr-cta"}
                >
                  Start free trial <ArrowRight size={13} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* FAQ / trust */}
        <div className="pr-trust pr-enter pr-enter-3">
          <div className="pr-trust-item">
            <p className="pr-trust-head">14-day free trial</p>
            <p className="pr-trust-body">Every plan starts with a full-featured trial. No card needed.</p>
          </div>
          <div className="pr-trust-div" />
          <div className="pr-trust-item">
            <p className="pr-trust-head">Cancel anytime</p>
            <p className="pr-trust-body">No contracts. Downgrade or cancel from your workspace settings.</p>
          </div>
          <div className="pr-trust-div" />
          <div className="pr-trust-item">
            <p className="pr-trust-head">Your data stays yours</p>
            <p className="pr-trust-body">Export everything at any time. We never hold your data hostage.</p>
          </div>
        </div>

        <p className="pr-back">
          <Link href="/">← Back to home</Link>
        </p>
      </main>
    </>
  );
}

const STYLES = `
  :root {
    --bg:      #F6F9F7;
    --surface: #FFFFFF;
    --border:  #D8E6DE;
    --text:    #0C1C12;
    --muted:   #4E6A58;
    --forest:  #2DC876;
    --forest-h:#25AE65;
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
    --bg:      #0C1210; --surface: #131A16;
    --border:  #1C2A22; --text:    #D6EDE0; --muted: #4E7A60;
  }
  :root[data-theme="light"] {
    --bg:      #F6F9F7; --surface: #FFFFFF;
    --border:  #D8E6DE; --text:    #0C1C12; --muted: #4E6A58;
  }

  .pr-nav {
    position: sticky; top: 0; z-index: 50;
    background: color-mix(in srgb, var(--bg) 85%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-sans, system-ui, sans-serif);
  }
  .pr-nav-inner {
    max-width: 1100px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; height: 60px;
  }
  .pr-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: var(--text);
    text-decoration: none; letter-spacing: -0.02em;
  }
  .pr-nav-right { display: flex; align-items: center; gap: 20px; }
  .pr-nav-link {
    font-size: 14px; font-weight: 500; color: var(--muted);
    text-decoration: none; transition: color 0.15s;
  }
  .pr-nav-link:hover { color: var(--text); }

  .pr-btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--forest); color: #fff;
    font-size: 14px; font-weight: 600; border-radius: 10px;
    padding: 10px 20px; text-decoration: none;
    transition: background 0.15s;
  }
  .pr-btn-primary:hover { background: var(--forest-h); }
  .pr-btn-sm { padding: 8px 16px; font-size: 13px; border-radius: 8px; }

  .pr-btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: var(--text);
    font-size: 14px; font-weight: 500; border-radius: 10px;
    padding: 10px 20px; text-decoration: none;
    border: 1px solid var(--border);
    transition: background 0.15s;
  }
  .pr-btn-ghost:hover { background: var(--border); }

  .pr-main {
    background: var(--bg);
    min-height: 100vh;
    padding: 72px 24px 80px;
    font-family: var(--font-sans, system-ui, sans-serif);
  }

  .pr-hero {
    text-align: center; max-width: 560px; margin: 0 auto 64px;
  }
  .pr-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--forest);
    margin-bottom: 12px; display: block;
  }
  .pr-h1 {
    font-size: clamp(32px, 4vw, 52px); font-weight: 800;
    letter-spacing: -0.04em; line-height: 1.08;
    color: var(--text); margin: 0 0 16px; text-wrap: balance;
  }
  .pr-sub {
    font-size: 16px; line-height: 1.65; color: var(--muted); margin: 0;
  }

  .pr-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1000px; margin: 0 auto 48px;
  }
  @media (max-width: 780px) {
    .pr-grid { grid-template-columns: 1fr; max-width: 400px; }
  }

  .pr-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 32px 28px 28px;
    display: flex; flex-direction: column;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .pr-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.09);
  }
  .pr-popular {
    border-color: var(--forest);
    box-shadow: 0 0 0 1px var(--forest), 0 8px 32px color-mix(in srgb, var(--forest) 15%, transparent);
  }
  .pr-popular:hover {
    box-shadow: 0 0 0 1px var(--forest), 0 20px 52px color-mix(in srgb, var(--forest) 22%, transparent);
  }

  .pr-popular-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--forest); color: #fff;
    font-size: 11px; font-weight: 700; padding: 4px 10px;
    border-radius: 100px; margin-bottom: 16px; width: fit-content;
  }

  .pr-card-top { margin-bottom: 28px; }
  .pr-plan-name {
    font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 12px;
  }
  .pr-price {
    display: flex; align-items: flex-end; gap: 2px; line-height: 1;
  }
  .pr-dollar { font-size: 20px; font-weight: 700; color: var(--text); align-self: flex-start; margin-top: 8px; }
  .pr-amount {
    font-size: 60px; font-weight: 800; letter-spacing: -0.05em;
    color: var(--text); font-variant-numeric: tabular-nums;
  }
  .pr-period { font-size: 15px; color: var(--muted); margin-bottom: 8px; }
  .pr-billed { font-size: 12px; color: var(--muted); margin-top: 4px; }

  .pr-features {
    list-style: none; padding: 0; margin: 0 0 28px;
    display: flex; flex-direction: column; gap: 13px;
    flex: 1;
    border-top: 1px solid var(--border); padding-top: 24px;
  }
  .pr-feat {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; color: var(--text);
  }
  .pr-check { color: var(--forest); flex-shrink: 0; }

  .pr-cta {
    width: 100%; justify-content: center;
    padding: 12px 20px; font-size: 14px; border-radius: 10px;
  }

  .pr-trust {
    max-width: 860px; margin: 0 auto 48px;
    display: flex; gap: 0; align-items: stretch;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden;
  }
  .pr-trust-item {
    flex: 1; padding: 28px 32px;
  }
  .pr-trust-div {
    width: 1px; background: var(--border); flex-shrink: 0;
  }
  .pr-trust-head {
    font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 6px;
  }
  .pr-trust-body {
    font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0;
  }
  @media (max-width: 640px) {
    .pr-trust { flex-direction: column; }
    .pr-trust-div { width: 100%; height: 1px; }
  }

  .pr-back {
    text-align: center; margin-top: 16px;
  }
  .pr-back a {
    font-size: 14px; color: var(--muted); text-decoration: none;
    transition: color 0.15s;
  }
  .pr-back a:hover { color: var(--forest); }

  @keyframes pr-enter {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pr-enter {
    opacity: 0;
    animation: pr-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .pr-enter-1 { animation-delay: 0.05s; }
  .pr-enter-2 { animation-delay: 0.18s; }
  .pr-enter-3 { animation-delay: 0.30s; }

  @media (prefers-reduced-motion: reduce) {
    .pr-enter { opacity: 1; animation: none; }
  }
`;
