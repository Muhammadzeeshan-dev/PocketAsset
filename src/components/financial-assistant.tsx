"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Bot,
  HelpCircle,
  Lightbulb,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { formatPkr, type FinanceAccount, type FinanceTransaction } from "@/lib/finance";
import { answerFinancialQueryLocally, type AssistantMessage } from "@/lib/assistant";
import { calculatePortfolioSummary, INITIAL_VERIFIED_HOLDINGS, type StockHolding } from "@/lib/investments";

interface FinancialAssistantProps {
  userId: string;
  supabase: SupabaseClient;
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  selectedDate: string;
  dataAvailable: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onToast: (msg: string) => void;
}

export function FinancialAssistant({
  userId,
  supabase,
  accounts,
  transactions,
  selectedDate,
  dataAvailable,
  refreshing,
  onRefresh,
  onToast,
}: FinancialAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      content:
        "Assalam-o-Alaikum! I am your private PocketAsset Financial Assistant. I can answer questions directly from your verified ledger, track your PSX portfolio, calculate weekly university food spending, and evaluate purchase affordability without ever guessing or inventing numbers.",
      timestamp: "12:00 PM",
    },
  ]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  // PSX portfolio metrics
  const portfolioSummary = useMemo(() => {
    const dummyHoldings: StockHolding[] = INITIAL_VERIFIED_HOLDINGS.map((h, i) => ({
      ...h,
      id: `holding-${i + 1}`,
      user_id: userId,
    }));
    return calculatePortfolioSummary(dummyHoldings);
  }, [userId]);

  function handleSend(queryText?: string) {
    const text = (queryText || input).trim();
    if (!text) return;

    const userMsg: AssistantMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      content: text,
      timestamp: "12:00 PM",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setThinking(true);

    setTimeout(() => {
      const response = answerFinancialQueryLocally(
        text,
        accounts,
        transactions,
        portfolioSummary,
        selectedDate
      );

      const botMsg: AssistantMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        content: response.reply,
        financialFactSnippet: response.snippet,
        timestamp: "12:00 PM",
      };

      setMessages((prev) => [...prev, botMsg]);
      setThinking(false);
    }, 400);
  }

  const promptSuggestions = [
    "How much is left in my accounts?",
    "What did I buy yesterday?",
    "How much did I spend on food this week?",
    "How much money did I receive this Monday?",
    "How is my investment portfolio performing?",
    "Which category consumed most of my money?",
    "Can I afford Rs 4,500?",
  ];

  return (
    <div className="financial-assistant-page" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Zero-hallucination Intelligence</p>
          <h1>Financial Assistant<span className="heading-period">.</span></h1>
          <p className="page-subtitle">
            Ask questions about your allowances, daily transport spending, savings, or stock portfolio.
          </p>
        </div>
      </section>

      {/* Suggested prompts carousel/chips */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
        {promptSuggestions.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="outline-button"
            style={{ fontSize: "0.8rem", whiteSpace: "nowrap", padding: "6px 12px", backgroundColor: "#fff" }}
            onClick={() => handleSend(prompt)}
          >
            <Sparkles size={13} style={{ color: "#2563eb", marginRight: "4px" }} />
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div
        className="dashboard-card"
        style={{
          minHeight: "450px",
          maxHeight: "550px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "1.25rem",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              gap: "0.75rem",
              alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}
          >
            {m.sender === "assistant" && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bot size={18} />
              </div>
            )}

            <div
              style={{
                backgroundColor: m.sender === "user" ? "#2563eb" : "#f8fafc",
                color: m.sender === "user" ? "#fff" : "#0f172a",
                border: m.sender === "user" ? "none" : "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.85rem 1rem",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                whiteSpace: "pre-line",
              }}
            >
              {m.content}

              {m.financialFactSnippet && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "#fff",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    color: "#334155",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#2563eb" }}>
                    {m.financialFactSnippet.metricName}: {m.financialFactSnippet.value}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                    {m.financialFactSnippet.breakdownExplanation}
                  </div>
                </div>
              )}

              <div
                style={{
                  fontSize: "0.7rem",
                  color: m.sender === "user" ? "#cbd5e1" : "#94a3b8",
                  textAlign: "right",
                  marginTop: "0.35rem",
                }}
              >
                {m.timestamp}
              </div>
            </div>

            {m.sender === "user" && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div style={{ display: "flex", gap: "0.75rem", alignSelf: "flex-start" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={18} />
            </div>
            <div style={{ padding: "0.75rem 1rem", backgroundColor: "#f8fafc", borderRadius: "8px", fontSize: "0.85rem", color: "#64748b" }}>
              Scanning ledger records…
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}
      >
        <input
          type="text"
          placeholder="Ask anything about your money, e.g. 'Can I afford Rs 5,000?'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "0.9rem",
            backgroundColor: "#fff",
          }}
        />
        <button
          type="submit"
          className="primary-button"
          disabled={!input.trim() || thinking}
          style={{ padding: "0 1.25rem" }}
        >
          <Send size={16} /> Send
        </button>
      </form>

      {/* Privacy note */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "0.75rem", fontSize: "0.75rem", color: "#64748b" }}>
        <Lock size={12} />
        <span>Runs locally on your device. Never shares private financial balances with third parties.</span>
      </div>
    </div>
  );
}
