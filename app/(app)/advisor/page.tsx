"use client";

import { useState } from "react";
import { Send, Bot, User } from "lucide-react";

const PROMPT_CHIPS = [
  "What's my best canola marketing strategy right now?",
  "Give me a pre-harvest machinery checklist",
  "How do I manage a late-season disease in wheat?",
  "What should I know about hiring LMIA workers?",
  "Help me build a 60-day sell plan for wheat",
  "What are the biggest safety risks during harvest?",
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
      };
      setMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A7C59] flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#222527]">Lily</h1>
            <p className="text-xs text-[#7A8A7C]">Your AG360 Agricultural Advisor · PhD Plant Science, Soil Health, Crop Science</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-[#FFF8EC] border border-[#F5D78E] rounded-[12px]">
          <p className="text-xs text-[#7A8A7C]">⚠️ Lily provides operational guidance only — not legal, financial, or medical advice. Always verify crop protection recommendations against the registered product label.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-[#7A8A7C] text-center">Ask Lily anything about your farm operation.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="text-xs bg-white border border-[#E4E7E0] text-[#222527] px-4 py-2 rounded-full hover:bg-[#DDE3D6] hover:border-[#4A7C59] transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-2xl rounded-[16px] px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#4A7C59] text-white"
                  : "bg-white border border-[#E4E7E0] text-[#222527]"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-[#4A7C59]" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center shrink-0 mt-1">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-[#E4E7E0] rounded-[16px] px-5 py-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex gap-3 items-center bg-white border border-[#E4E7E0] rounded-[20px] px-4 py-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask Lily about your farm..."
          className="flex-1 text-sm text-[#222527] placeholder:text-[#7A8A7C] outline-none bg-transparent"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center hover:bg-[#3d6b4a] transition-colors disabled:opacity-40"
        >
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
}