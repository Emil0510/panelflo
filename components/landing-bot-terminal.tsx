"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

type Line =
  | { type: "prompt"; text: string }
  | { type: "output"; text: string }
  | { type: "error"; text: string };

const RESPONSES: Record<string, string> = {
  default: "✓ Command received. Sign up to connect Flo to your real workspace.",
};

function getResponse(cmd: string): string {
  const c = cmd.toLowerCase().trim();
  if (c.includes("overdue") || c.includes("task"))
    return "📋  2 overdue tasks found:\n    › Send proposal to Acme    [2d late]\n    › Follow up with Sara       [1d late]";
  if (c.includes("won") || c.includes("deal") || c.includes("move"))
    return "✅  Deal stage updated → Won\n    Pipeline value: $18,400";
  if (c.includes("stat") || c.includes("week") || c.includes("report"))
    return "📊  Weekly summary:\n    Deals closed: 3  ·  Revenue: $12.4k\n    Task completion: 94%";
  if (c.includes("note"))
    return "📝  Note logged to contact timeline\n    Timestamp: just now";
  if (c.includes("assign") || c.includes("maya"))
    return "👤  Task ownership → Maya\n    Maya has been notified";
  if (c.includes("contact") || c.includes("add"))
    return "✔   Contact added and assigned to you\n    CRM updated";
  if (c.includes("help") || c === "?")
    return "Flo understands natural language — no commands to memorize.\n    Try: 'list tasks', 'create deal', 'weekly stats'";
  return RESPONSES.default;
}

const SEED: Line[] = [
  { type: "prompt", text: "List overdue tasks" },
  { type: "output", text: "📋  2 overdue tasks found:\n    › Send proposal to Acme    [2d late]\n    › Follow up with Sara       [1d late]" },
  { type: "prompt", text: "Weekly stats" },
  { type: "output", text: "📊  Weekly summary:\n    Deals closed: 3  ·  Revenue: $12.4k\n    Task completion: 94%" },
];

export function LandingBotTerminal({ examples }: { examples: string[] }) {
  const [lines, setLines]   = useState<Line[]>(SEED);
  const [input, setInput]   = useState("");
  const [busy, setBusy]     = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines, busy]);

  function run(cmd: string) {
    const text = cmd.trim();
    if (!text || busy) return;
    setInput("");
    setLines((prev) => [...prev, { type: "prompt", text }]);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setLines((prev) => [...prev, { type: "output", text: getResponse(text) }]);
    }, 700);
  }

  return (
    <div className="pf-term">
      {/* Title bar */}
      <div className="pf-term-bar">
        <span className="pf-term-dot pf-term-red" />
        <span className="pf-term-dot pf-term-yellow" />
        <span className="pf-term-dot pf-term-green" />
        <span className="pf-term-title">flo — natural language CRM</span>
      </div>

      {/* Output area */}
      <div className="pf-term-body" ref={bodyRef}>
        <p className="pf-term-info">
          Connected to Flo Agent · type any command or click an example
        </p>
        {lines.map((l, i) =>
          l.type === "prompt" ? (
            <div key={i} className="pf-term-line">
              <span className="pf-term-ps">❯</span>
              <span className="pf-term-cmd">{l.text}</span>
            </div>
          ) : (
            <div key={i} className="pf-term-output" style={{ whiteSpace: "pre-line" }}>
              {l.text}
            </div>
          )
        )}
        {busy && (
          <div className="pf-term-line">
            <span className="pf-term-ps">❯</span>
            <span className="pf-term-cursor" />
          </div>
        )}
      </div>

      {/* Example chips */}
      <div className="pf-term-examples">
        {examples.map((e) => (
          <button key={e} className="pf-term-chip" onClick={() => run(e)} disabled={busy}>
            {e}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="pf-term-input-row">
        <span className="pf-term-ps pf-term-ps-input">❯</span>
        <input
          className="pf-term-input"
          placeholder="Type any command…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(input)}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="pf-term-send"
          onClick={() => run(input)}
          disabled={busy || !input.trim()}
          aria-label="Run"
        >
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
