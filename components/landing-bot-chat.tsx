"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Msg = { from: "user" | "bot"; text: string };

const SEED: Msg[] = [
  { from: "user", text: "List overdue tasks" },
  { from: "bot",  text: "📋 2 overdue tasks:\n• Send proposal to Acme — 2 days late\n• Follow up with Sara — 1 day late" },
  { from: "user", text: "Move Acme deal to Won" },
  { from: "bot",  text: "✅ Acme moved to Won. Nice close! 💪" },
  { from: "user", text: "Weekly stats" },
  { from: "bot",  text: "📊 This week: 3 deals closed · $12.4k revenue · 94% task rate" },
];

const FLO_REPLIES = [
  "👋 Great question! Sign up to connect Flo to your workspace and get real answers.",
  "📝 Got it! In your live workspace, Flo would handle that in seconds.",
  "✨ Flo can do that and more — start your free trial to try it with real data.",
  "🚀 On it! Create your free workspace to connect Flo to your pipeline.",
  "💡 That's exactly what Flo is built for. Sign up and run that command for real.",
];

export function LandingBotChat() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const bodyRef  = useRef<HTMLDivElement>(null);
  const replyIdx = useRef(0);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text || typing) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply = FLO_REPLIES[replyIdx.current % FLO_REPLIES.length];
      replyIdx.current++;
      setTyping(false);
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    }, 1100);
  }

  return (
    <div className="pf-bot-chat">
      {/* Header */}
      <div className="pf-bot-chat-header">
        <div className="pf-bot-chat-avatar">
          <Image src="/icon-dark.svg" alt="Flo" width={28} height={28} />
        </div>
        <div>
          <p className="pf-bot-chat-name">Flo Agent</p>
          <p className="pf-bot-chat-status">
            <span className="pf-dot" /> online · responds instantly
          </p>
        </div>
        <div className="pf-bot-chat-platforms">
          <span className="pf-bot-platform-tag">Telegram</span>
          <span className="pf-bot-platform-tag">WhatsApp</span>
        </div>
      </div>

      {/* Messages */}
      <div className="pf-bot-chat-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`pf-bot-msg ${m.from === "user" ? "pf-bot-msg-user" : "pf-bot-msg-flo"}`}
            style={{ whiteSpace: "pre-line" }}
          >
            {m.from === "bot" && <span className="pf-bot-msg-label">Flo</span>}
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="pf-bot-typing">
            <span /><span /><span />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pf-bot-chat-input">
        <input
          className="pf-bot-input-field"
          placeholder="Message Flo in natural language…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={typing}
          autoComplete="off"
        />
        <button
          className="pf-send"
          aria-label="Send"
          onClick={send}
          disabled={typing || !input.trim()}
        >
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
