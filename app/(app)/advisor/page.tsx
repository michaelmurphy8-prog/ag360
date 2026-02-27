"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Sparkles, AlertTriangle, CheckCircle, Wheat, Tractor, DollarSign, Sprout, Bug, Users, TrendingUp, Scale, Paperclip, X, FileText, Image } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import LilyIcon from "@/components/LilyIcon";

// ─── Prompt Chips with Icons ──────────────────────────────────

const PROMPT_CHIPS = [
  { text: "Build me a sell plan for my canola crop", icon: TrendingUp },
  { text: "What's the best contract type for wheat right now?", icon: Scale },
  { text: "Explain basis and how I should use it", icon: DollarSign },
  { text: "Give me a pre-harvest machinery checklist", icon: Tractor },
  { text: "How do I calculate my break-even price per bushel?", icon: Wheat },
  { text: "What should I watch for in my canola at swathing?", icon: Sprout },
  { text: "Help me think through hiring LMIA workers", icon: Users },
  { text: "What are the biggest margin leaks on most farms?", icon: Bug },
];

// ─── Types ────────────────────────────────────────────────────

type FarmProfile = {
  farmName: string;
  province: string;
  soilZone: string;
  totalAcres: number;
  storageCapacity: number;
  primaryElevator: string;
  riskProfile: string;
  inventory: {
    crop: string;
    mode: "on_hand" | "forecast";
    bushels?: number;
    acres?: number;
    aph?: number;
    targetPrice?: number;
    landRent?: number;
    equipmentDepreciation?: number;
    insurance?: number;
    propertyTax?: number;
    overhead?: number;
    seed?: number;
    fertilizer?: number;
    herbicide?: number;
    fungicide?: number;
    insecticide?: number;
    fuel?: number;
    drying?: number;
    trucking?: number;
    elevation?: number;
    cropInsurance?: number;
  }[];
};

type Attachment = {
  name: string;
  type: string;
  base64: string;
  mediaType: string;
};

type Message = {
  role: "user" | "assistant";
  content: string | any[];
};

// ─── Farm Context Builder ─────────────────────────────────────

function buildFarmContext(profile: FarmProfile): string {
  if (!profile.farmName) return "";

  const inventoryLines = profile.inventory
    .filter((i) => i.crop)
    .map((i) => {
      const fixedPerAcre = (i.landRent || 0) + (i.equipmentDepreciation || 0) + (i.insurance || 0) + (i.propertyTax || 0) + (i.overhead || 0);
      const variablePerAcre = (i.seed || 0) + (i.fertilizer || 0) + (i.herbicide || 0) + (i.fungicide || 0) + (i.insecticide || 0) + (i.fuel || 0) + (i.drying || 0) + (i.trucking || 0) + (i.elevation || 0) + (i.cropInsurance || 0);
      const totalCostPerAcre = fixedPerAcre + variablePerAcre;
      const bu = i.mode === "on_hand" ? (i.bushels || 0) : (i.acres || 0) * (i.aph || 0);
      const breakEven = (i.acres || 0) > 0 && (i.aph || 0) > 0 ? totalCostPerAcre / (i.aph || 1) : 0;
      const grossRevenue = bu * (i.targetPrice || 0);
      const totalCost = totalCostPerAcre * (i.acres || 0);
      const netProfit = grossRevenue - totalCost;

      if (i.mode === "on_hand") {
        return `  - ${i.crop}: ${bu.toLocaleString()} bu on hand | Target: $${i.targetPrice || 0}/bu`;
      } else {
        return `  - ${i.crop}: ${i.acres || 0} ac x ${i.aph || 0} bu/ac = ${bu.toLocaleString()} bu forecast | Target: $${i.targetPrice || 0}/bu | Cost/ac: $${totalCostPerAcre.toFixed(0)} | Break-even: $${breakEven.toFixed(2)}/bu | Gross: $${grossRevenue.toLocaleString()} | Net: $${netProfit.toLocaleString()}`;
      }
    })
    .join("\n");

  return `FARMER PROFILE - USE THIS CONTEXT FOR ALL ADVICE:
Farm: ${profile.farmName}
Location: ${profile.province}, ${profile.soilZone} soil zone
Total Acres: ${profile.totalAcres?.toLocaleString() || "unknown"}
On-Farm Storage: ${profile.storageCapacity?.toLocaleString() || "unknown"} bu
Primary Elevator: ${profile.primaryElevator || "not specified"}
Risk Profile: ${profile.riskProfile || "Balanced"}

CROPS, INVENTORY & ECONOMICS:
${inventoryLines || "  No crops entered yet"}

Tailor ALL advice specifically to this farm. Use their actual acres, bushels, break-even prices, and risk profile in every recommendation. Reference ${profile.farmName} by name.`.trim();
}

// ─── AI Message Renderer ──────────────────────────────────────

function LilyMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    const boldMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      elements.push(
        <p key={key++} className="text-[13px] font-semibold text-[#F1F5F9] mt-3 mb-1 tracking-tight">
          {boldMatch[1]}
        </p>
      );
      i++;
      continue;
    }

    const numMatch = line.match(/^(\d+)\.\s*\*?\*?(.+?)(?:\*\*)?$/);
    if (numMatch) {
      const text = numMatch[2].replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#F1F5F9] font-medium">$1</strong>');
      elements.push(
        <div key={key++} className="flex gap-3 mt-1.5">
          <span className="font-mono text-[11px] text-[#34D399] font-semibold mt-[2px] w-4 flex-shrink-0 text-right">{numMatch[1]}.</span>
          <p className="text-[13px] text-[#CBD5E1] leading-[1.7]" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
      i++;
      continue;
    }

    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1].replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#F1F5F9] font-medium">$1</strong>');
      elements.push(
        <div key={key++} className="flex gap-3 mt-1">
          <span className="w-1 h-1 rounded-full bg-[#34D399] mt-[8px] flex-shrink-0" />
          <p className="text-[13px] text-[#CBD5E1] leading-[1.7]" dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      );
      i++;
      continue;
    }

    const text = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#F1F5F9] font-medium">$1</strong>');
    elements.push(
      <p key={key++} className="text-[13px] text-[#CBD5E1] leading-[1.7]" dangerouslySetInnerHTML={{ __html: text }} />
    );
    i++;
  }

  return <div className="space-y-0">{elements}</div>;
}

// ═══════════════════════════════════════════════════════════════
//  ADVISOR PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdvisorPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/farm-profile", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile(data.profile);
        setProfileLoaded(true);
      });
}, [user?.id]);
// Auto-send prompt from query params (e.g. from Marketing chips)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt");
    if (prompt) {
      setPendingPrompt(prompt);
      window.history.replaceState({}, "", "/advisor");
    }
  }, []);

  useEffect(() => {
    if (pendingPrompt && user?.id && !loading && messages.length === 0) {
      sendMessage(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, user?.id, loading]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType = file.type || "application/octet-stream";
        setAttachments((prev) => [...prev, { name: file.name, type: file.type, base64, mediaType }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }
  async function sendMessage(text: string) {
    if ((!text.trim() && attachments.length === 0) || loading) return;
    const farmContext = profile ? buildFarmContext(profile) : "";

    const contentBlocks: any[] = [];
    for (const att of attachments) {
      if (att.type.startsWith("image/")) {
        contentBlocks.push({ type: "image", source: { type: "base64", media_type: att.mediaType, data: att.base64 } });
      } else if (att.type === "application/pdf") {
        contentBlocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.base64 } });
      } else {
        try { const decoded = atob(att.base64); contentBlocks.push({ type: "text", text: `[File: ${att.name}]\n${decoded}` }); }
        catch { contentBlocks.push({ type: "text", text: `[File: ${att.name} — could not decode]` }); }
      }
    }
    if (text.trim()) contentBlocks.push({ type: "text", text: text.trim() });

    const displayContent = [...attachments.map((a) => `📎 ${a.name}`), text.trim()].filter(Boolean).join("\n");
    const userMessage: Message = { role: "user", content: displayContent };
    const apiUserMessage = { role: "user", content: contentBlocks.length === 1 && contentBlocks[0].type === "text" ? contentBlocks[0].text : contentBlocks };
    const updatedMessages = [...messages, userMessage];
    const apiMessages = [...messages.map((m) => ({ role: m.role, content: m.content })), apiUserMessage];

    setMessages(updatedMessages);
    setInput("");
    setAttachments([]);
    setLoading(true);
    setStreamingText("");
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" },
        body: JSON.stringify({ messages: apiMessages, farmContext }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
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

  const hasMessages = messages.length > 0 || loading;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Lily Avatar with glow */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#34D399]/20 blur-md" />
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))", border: "1px solid rgba(52,211,153,0.25)" }}>
                <LilyIcon size={24} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[24px] font-bold text-[#F1F5F9] tracking-tight">Lily</h1>
                <span className="flex items-center gap-1 font-mono text-[9px] font-semibold text-[#34D399] bg-[#34D399]/[0.06] border border-[#34D399]/15 px-2 py-0.5 rounded-full uppercase tracking-[1.5px]">
                  <Sparkles size={9} /> AG360 Advisor
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-40" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
                  </span>
                  <span className="font-mono text-[9px] text-[#64748B] uppercase tracking-[1px]">Online</span>
                </span>
              </div>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                {profileLoaded && profile
                  ? `Connected to ${profile.farmName} · ${profile.province} · ${profile.riskProfile} risk`
                  : "Grain marketing · Agronomy · Farm business"}
              </p>
            </div>
          </div>
          {profileLoaded && !profile && (
            <a href="/farm-profile" className="text-[11px] font-semibold text-[#34D399] bg-[#34D399]/[0.06] border border-[#34D399]/15 px-4 py-2 rounded-full hover:bg-[#34D399]/[0.12] transition-colors">
              Set Up Farm Profile →
            </a>
          )}
          {profileLoaded && profile && (
            <a href="/farm-profile" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#34D399] bg-[#34D399]/[0.06] border border-[#34D399]/15 px-4 py-2 rounded-full hover:bg-[#34D399]/[0.12] transition-colors">
              <CheckCircle size={11} /> {profile.farmName}
            </a>
          )}
        </div>

        <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.08)" }}>
          <AlertTriangle size={11} className="text-[#F59E0B]/60 flex-shrink-0" />
          <p className="text-[10px] text-[#64748B]">Operational guidance only — not legal, financial, or medical advice. Verify crop protection rates against registered labels.</p>
        </div>
      </div>

      {/* ── Chat Area ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto mb-4 pr-1 scrollbar-thin">

        {/* Empty State */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full -mt-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-[#34D399]/10 blur-2xl scale-150 animate-pulse" style={{ animationDuration: "3s" }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.04))", border: "1px solid rgba(52,211,153,0.20)" }}>
                <LilyIcon size={44} />
              </div>
            </div>

            <h2 className="text-[20px] font-semibold text-[#F1F5F9] tracking-tight mb-1">
              What do you need to win today?
            </h2>
            <p className="text-[13px] text-[#64748B] mb-8 max-w-md text-center">
              {profile
                ? `Every answer is tailored to ${profile.farmName} — your acres, costs, and risk profile.`
                : "Your agronomist and grain marketer — combined into one advisor, available 24/7."}
            </p>

            <div className="grid grid-cols-2 gap-2 max-w-xl w-full">
              {PROMPT_CHIPS.map(({ text, icon: Icon }) => (
                <button key={text} onClick={() => sendMessage(text)}
                  className="group flex items-start gap-3 text-left px-4 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(52,211,153,0.04)";
                    e.currentTarget.style.borderColor = "rgba(52,211,153,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  }}>
                  <Icon size={14} className="text-[#64748B] group-hover:text-[#34D399] mt-0.5 flex-shrink-0 transition-colors" />
                  <span className="text-[12px] text-[#94A3B8] group-hover:text-[#F1F5F9] leading-snug transition-colors">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                    style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))", border: "1px solid rgba(52,211,153,0.20)" }}>
                    <LilyIcon size={16} />
                  </div>
                )}
                <div className={`relative group/msg max-w-2xl ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-md px-5 py-3"
                    : "rounded-2xl rounded-bl-md px-5 py-4"
                }`}
                  style={msg.role === "user"
                    ? { background: "linear-gradient(135deg, #34D399, #2DD4A8)" }
                    : { background: "rgba(17,24,39,0.8)", border: "1px solid rgba(255,255,255,0.06)" }
                  }>
                  {msg.role === "assistant"
                    ? <LilyMessage content={typeof msg.content === "string" ? msg.content : msg.content.map((b: any) => b.text || "").join("\n")} />
                    : <p className="text-[13px] text-[#080C15] font-medium leading-relaxed">{msg.content}</p>
                  }
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(typeof msg.content === "string" ? msg.content : msg.content.map((b: any) => b.text || "").join("\n"))
                        const btn = document.getElementById(`copy-${i}`);
                        if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 1500); }
                      }}
                      id={`copy-${i}`}
                      className="absolute -bottom-6 right-0 opacity-0 group-hover/msg:opacity-100 transition-opacity text-[10px] font-medium px-2.5 py-1 rounded-md"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#94A3B8" }}
                    >
                      Copy
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-1">
                    <User size={12} className="text-[#94A3B8]" />
                  </div>
                )}
              </div>
            ))}

            {streamingText && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))", border: "1px solid rgba(52,211,153,0.20)" }}>
                  <LilyIcon size={16} />
                </div>
                <div className="max-w-2xl rounded-2xl rounded-bl-md px-5 py-4"
                  style={{ background: "rgba(17,24,39,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <LilyMessage content={streamingText} />
                  <span className="inline-block w-[3px] h-[16px] bg-[#34D399] ml-1 animate-pulse rounded-full" style={{ animationDuration: "0.8s" }} />
                </div>
              </div>
            )}

            {loading && !streamingText && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))", border: "1px solid rgba(52,211,153,0.20)" }}>
                  <LilyIcon size={16} />
                </div>
                <div className="rounded-2xl rounded-bl-md px-5 py-4"
                  style={{ background: "rgba(17,24,39,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span className="text-[11px] text-[#475569] font-mono">thinking</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input Bar (glass) ─────────────────────────────── */}
      <div
        className="flex-shrink-0 rounded-xl px-4 py-3 transition-all duration-300"
        style={{
          background: inputFocused
            ? "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(17,24,39,0.90))"
            : "rgba(17,24,39,0.8)",
          border: inputFocused
            ? "1px solid rgba(52,211,153,0.25)"
            : "1px solid rgba(255,255,255,0.06)",
          boxShadow: inputFocused
            ? "0 0 20px rgba(52,211,153,0.06), inset 0 1px 0 rgba(255,255,255,0.03)"
            : "inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)", color: "#34D399" }}>
                {att.type.startsWith("image/") ? <Image size={11} /> : <FileText size={11} />}
                <span className="max-w-[120px] truncate">{att.name}</span>
                <button onClick={() => removeAttachment(i)} className="hover:text-white transition-colors ml-0.5"><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.csv,.txt,.xlsx,.xls,.doc,.docx"
            multiple
            className="hidden"
          />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.04)" }}
            title="Attach file">
            <Paperclip size={14} className="text-[#64748B]" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask Lily anything about your farm operation..."
            className="flex-1 text-[13px] text-[#F1F5F9] placeholder:text-[#475569] outline-none bg-transparent"
          />
          <button onClick={() => sendMessage(input)} disabled={loading || (!input.trim() && attachments.length === 0)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-30"
            style={{
              background: (!input.trim() && attachments.length === 0) || loading ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #34D399, #2DD4A8)",
              boxShadow: (input.trim() || attachments.length > 0) && !loading ? "0 2px 8px rgba(52,211,153,0.25)" : "none",
            }}>
            <Send size={14} className={(input.trim() || attachments.length > 0) && !loading ? "text-[#080C15]" : "text-[#475569]"} />
          </button>
        </div>
      </div>
    </div>
  );
}