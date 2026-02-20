"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Sparkles } from "lucide-react";
import { useUser } from "@clerk/nextjs";

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

type Message = {
  role: "user" | "assistant";
  content: string;
};

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

function MessageContent({ content }: { content: string }) {
  const formatted = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n(\d+)\./g, "</p><p><strong>$1.</strong>")
    .replace(/\n-/g, "</p><p>");

  return (
    <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: `<p>${formatted}</p>` }} />
  );
}

export default function AdvisorPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
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

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const farmContext = profile ? buildFarmContext(profile) : "";

const userMessage: Message = { role: "user", content: text };
const updatedMessages = [...messages, userMessage];
const apiMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { 
  "Content-Type": "application/json",
  "x-user-id": user?.id || "",
},
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DDE3D6] flex items-center justify-center text-2xl">
              👩‍🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#222527]">Lily</h1>
                <span className="flex items-center gap-1 text-xs font-semibold text-[#4A7C59] bg-[#EEF5F0] px-2 py-0.5 rounded-full">
                  <Sparkles size={10} /> AG360 Advisor
                </span>
              </div>
              <p className="text-xs text-[#7A8A7C]">
                {profileLoaded && profile
                  ? `${profile.farmName} · ${profile.province} · ${profile.riskProfile} risk profile`
                  : "Grain marketing · Agronomy · Farm business · Available 24/7"}
              </p>
            </div>
          </div>
          {profileLoaded && !profile && (
            <a href="/farm-profile" className="text-xs font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2 rounded-full hover:bg-[#DDE3D6] transition-colors">
              Set Up Farm Profile →
            </a>
          )}
          {profileLoaded && profile && (
            <a href="/farm-profile" className="text-xs font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2 rounded-full hover:bg-[#DDE3D6] transition-colors">
              ✓ {profile.farmName} Profile
            </a>
          )}
        </div>
        <div className="mt-3 p-3 bg-[#FFF8EC] border border-[#F5D78E] rounded-[12px]">
          <p className="text-xs text-[#7A8A7C]">⚠️ Lily provides operational guidance — not legal, financial, or medical advice. Verify crop protection rates against the registered product label.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && !loading && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#222527]">What do you need to win today?</p>
              <p className="text-xs text-[#7A8A7C]">
                {profile
                  ? `Lily knows ${profile.farmName} — every answer is tailored to your operation.`
                  : "Lily thinks like your best agronomist and sharpest grain marketer — combined."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {PROMPT_CHIPS.map((chip) => (
                <button key={chip} onClick={() => sendMessage(chip)}
                  className="text-xs bg-white border border-[#E4E7E0] text-[#222527] px-4 py-2 rounded-full hover:bg-[#DDE3D6] hover:border-[#4A7C59] transition-colors">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center shrink-0 mt-1 text-lg">
                👩‍🌾
              </div>
            )}
            <div className={`max-w-2xl rounded-[16px] px-5 py-4 ${
              msg.role === "user"
                ? "bg-[#4A7C59] text-white text-sm leading-relaxed"
                : "bg-white border border-[#E4E7E0] text-[#222527]"
            }`}>
              {msg.role === "assistant" ? <MessageContent content={msg.content} /> : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-[#4A7C59]" />
              </div>
            )}
          </div>
        ))}

        {streamingText && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center shrink-0 mt-1 text-lg">
              👩‍🌾
            </div>
            <div className="max-w-2xl bg-white border border-[#E4E7E0] rounded-[16px] px-5 py-4 text-[#222527]">
              <MessageContent content={streamingText} />
              <span className="inline-block w-1.5 h-3.5 bg-[#4A7C59] ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center shrink-0 mt-1 text-lg">
              👩‍🌾
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

      <div className="flex gap-3 items-center bg-white border border-[#E4E7E0] rounded-[20px] px-4 py-3 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask Lily anything about your farm operation..."
          className="flex-1 text-sm text-[#222527] placeholder:text-[#7A8A7C] outline-none bg-transparent"
        />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center hover:bg-[#3d6b4a] transition-colors disabled:opacity-40">
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
}
