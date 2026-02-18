"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

const PROMPT_CHIPS = [
  "Build me a sell plan for my canola crop",
  "What's the best contract type for wheat right now?",
  "Explain basis and how I should use it",
  "Give me a pre-harvest machinery checklist",
  "How do I calculate my break-even price per bushel?",
  "What should I watch for in my canola at swathing?",
  "Help me think through hiring LMIA workers",
  "What are the biggest margin leaks on most farms?",
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

function MessageContent({ content }: { content: string }) {
  const formatted = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n(\d+)\./g, "</p><p><strong>$1.</strong>")
    .replace(/\n-/g, "</p><p>•");

  return (
    <p
      className="text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: `<p>${formatted}</p>` }}
    />
  );
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        setStreamingText(fullText);
      }

      setMessages([...updatedMessages, { role: "assistant", content: fullText }]);
      setStreamingText("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#4A7C59] flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#222527]">Lily</h1>
              <span className="flex items-center gap-1 text-xs font-semibold text-[#4A7C59] bg-[#EEF5F0] px-2 py-0.5 rounded-full">
                <Sparkles size={10} /> AG360 Advisor
              </span>
            </div>
            <p className="text-xs text-[#7A8A7C]">Grain marketing · Agronomy · Farm business · Available 24/7</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-[#FFF8EC] border border-[#F5D78E] rounded-[12px]">
          <p className="text-xs text-[#7A8A7C]">⚠️ Lily provides operational guidance — not legal, financial, or medical advice. Verify crop protection rates against the registered product label.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && !loading && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#222527]">What do you need to win today?</p>
              <p className="text-xs text-[#7A8A7C]">Lily thinks like your best agronomist and sharpest grain marketer — combined.</p>
            </div>
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
            <div className={`max-w-2xl rounded-[16px] px-5 py-4 ${
              msg.role === "user"
                ? "bg-[#4A7C59] text-white text-sm leading-relaxed"
                : "bg-white border border-[#E4E7E0] text-[#222527]"
            }`}>
              {msg.role === "assistant" ? (
                <MessageContent content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-[#4A7C59]" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming response */}
        {streamingText && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center shrink-0 mt-1">
              <Bot size={14} className="text-white" />
            </div>
            <div className="max-w-2xl bg-white border border-[#E4E7E0] rounded-[16px] px-5 py-4 text-[#222527]">
              <MessageContent content={streamingText} />
              <span className="inline-block w-1.5 h-3.5 bg-[#4A7C59] ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {/* Loading dots */}
        {loading && !streamingText && (
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

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="flex gap-3 items-center bg-white border border-[#E4E7E0] rounded-[20px] px-4 py-3 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask Lily anything about your farm operation..."
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