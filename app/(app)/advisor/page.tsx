"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ChevronDown, ChevronUp, Save } from "lucide-react";
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

const CROPS = ["Canola", "CWRS Wheat", "Durum", "Barley", "Oats", "Peas", "Lentils", "Flax", "Soybeans", "Corn"];
const PROVINCES = ["Alberta", "Saskatchewan", "Manitoba", "Ontario"];
const SOIL_ZONES = ["Dark Brown", "Brown", "Black", "Grey", "Thin Black"];
const RISK_PROFILES = ["Conservative", "Balanced", "Aggressive"];

type InventoryMode = "on_hand" | "forecast";

type CropInventory = {
  crop: string;
  mode: InventoryMode;
  bushels?: number;
  acres?: number;
  aph?: number;
};

type FarmProfile = {
  farmName: string;
  province: string;
  soilZone: string;
  totalAcres: number;
  storageCapacity: number;
  primaryElevator: string;
  riskProfile: string;
  inventory: CropInventory[];
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
      if (i.mode === "on_hand") {
        return `  - ${i.crop}: ${i.bushels?.toLocaleString() || 0} bu on hand`;
      } else {
        const forecastBu = (i.acres || 0) * (i.aph || 0);
        return `  - ${i.crop}: ${i.acres || 0} ac × ${i.aph || 0} bu/ac APH = ${forecastBu.toLocaleString()} bu forecast`;
      }
    })
    .join("\n");

  return `
FARMER PROFILE — USE THIS CONTEXT FOR ALL ADVICE:
Farm: ${profile.farmName}
Location: ${profile.province}, ${profile.soilZone} soil zone
Total Acres: ${profile.totalAcres?.toLocaleString() || "unknown"}
On-Farm Storage: ${profile.storageCapacity?.toLocaleString() || "unknown"} bu
Primary Elevator: ${profile.primaryElevator || "not specified"}
Risk Profile: ${profile.riskProfile || "Balanced"}

INVENTORY & CROPS:
${inventoryLines || "  No crops entered yet"}

Tailor ALL advice specifically to this farm. Use their actual acres, bushels, and risk profile in every recommendation. Do not give generic prairie farmer advice — this is ${profile.farmName}.
`.trim();
}

function MessageContent({ content }: { content: string }) {
  const formatted = content
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n(\d+)\./g, "</p><p><strong>$1.</strong>")
    .replace(/\n-/g, "</p><p>•");

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState<FarmProfile>({
    farmName: "",
    province: "Saskatchewan",
    soilZone: "Black",
    totalAcres: 0,
    storageCapacity: 0,
    primaryElevator: "",
    riskProfile: "Balanced",
    inventory: [{ crop: "Canola", mode: "on_hand", bushels: 0 }],
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/farm-profile", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setProfileSaved(true);
        }
      });
  }, [user?.id]);

  async function saveProfile() {
    if (!user?.id) return;
    await fetch("/api/farm-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify({ profile }),
    });
    setProfileSaved(true);
    setProfileOpen(false);
  }

  function updateInventoryItem(index: number, field: string, value: unknown) {
    const updated = [...profile.inventory];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, inventory: updated });
  }

  function addCrop() {
    setProfile({
      ...profile,
      inventory: [...profile.inventory, { crop: "", mode: "on_hand", bushels: 0 }],
    });
  }

  function removeCrop(index: number) {
    setProfile({
      ...profile,
      inventory: profile.inventory.filter((_, i) => i !== index),
    });
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const farmContext = buildFarmContext(profile);
    const systemMessage = farmContext
      ? `[FARM CONTEXT]\n${farmContext}\n[END FARM CONTEXT]\n\nUser message: ${text}`
      : text;

    const userMessage: Message = { role: "user", content: text };
    const apiMessage = { role: "user", content: systemMessage };
    const updatedMessages = [...messages, userMessage];
    const apiMessages = [...messages, apiMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
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
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
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
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2 rounded-full hover:bg-[#DDE3D6] transition-colors"
          >
            {profileSaved ? "✓ Farm Profile" : "Set Up Farm Profile"}
            {profileOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Farm Profile Panel */}
        {profileOpen && (
          <div className="mt-4 bg-white border border-[#E4E7E0] rounded-[20px] p-6 space-y-5">
            <h2 className="text-sm font-bold text-[#222527]">Farm Profile — Lily uses this to personalize every response</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Farm Name</label>
                <input
                  type="text"
                  value={profile.farmName}
                  onChange={(e) => setProfile({ ...profile, farmName: e.target.value })}
                  placeholder="Murphy Farms"
                  className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Province</label>
                <select
                  value={profile.province}
                  onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white"
                >
                  {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Soil Zone</label>
                <select
                  value={profile.soilZone}
                  onChange={(e) => setProfile({ ...profile, soilZone: e.target.value })}
                  className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white"
                >
                  {SOIL_ZONES.map((z) => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Total Acres</label>
                <input
                  type="number"
                  value={profile.totalAcres || ""}
                  onChange={(e) => setProfile({ ...profile, totalAcres: Number(e.target.value) })}
                  placeholder="3200"
                  className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Storage Capacity (bu)</label>
                <input
                  type="number"
                  value={profile.storageCapacity || ""}
                  onChange={(e) => setProfile({ ...profile, storageCapacity: Number(e.target.value) })}
                  placeholder="50000"
                  className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Primary Elevator</label>
                <input
                  type="text"
                  value={profile.primaryElevator}
                  onChange={(e) => setProfile({ ...profile, primaryElevator: e.target.value })}
                  placeholder="Viterra Yorkton"
                  className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Risk Profile</label>
              <div className="flex gap-2">
                {RISK_PROFILES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setProfile({ ...profile, riskProfile: r })}
                    className={`text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
                      profile.riskProfile === r
                        ? "bg-[#4A7C59] text-white border-[#4A7C59]"
                        : "bg-white text-[#7A8A7C] border-[#E4E7E0] hover:border-[#4A7C59]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Crops & Inventory</label>
              {profile.inventory.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-[#F5F5F3] rounded-[12px]">
                  <select
                    value={item.crop}
                    onChange={(e) => updateInventoryItem(index, "crop", e.target.value)}
                    className="text-sm border border-[#E4E7E0] rounded-[8px] px-2 py-1.5 bg-white outline-none focus:border-[#4A7C59]"
                  >
                    <option value="">Select crop</option>
                    {CROPS.map((c) => <option key={c}>{c}</option>)}
                  </select>

                  <div className="flex rounded-full border border-[#E4E7E0] overflow-hidden bg-white">
                    <button
                      onClick={() => updateInventoryItem(index, "mode", "on_hand")}
                      className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
                        item.mode === "on_hand" ? "bg-[#4A7C59] text-white" : "text-[#7A8A7C] hover:bg-[#F5F5F3]"
                      }`}
                    >
                      On Hand
                    </button>
                    <button
                      onClick={() => updateInventoryItem(index, "mode", "forecast")}
                      className={`text-xs font-semibold px-3 py-1.5 transition-colors ${
                        item.mode === "forecast" ? "bg-[#4A7C59] text-white" : "text-[#7A8A7C] hover:bg-[#F5F5F3]"
                      }`}
                    >
                      Forecast
                    </button>
                  </div>

                  {item.mode === "on_hand" ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.bushels || ""}
                        onChange={(e) => updateInventoryItem(index, "bushels", Number(e.target.value))}
                        placeholder="Bushels"
                        className="w-28 text-sm border border-[#E4E7E0] rounded-[8px] px-2 py-1.5 outline-none focus:border-[#4A7C59]"
                      />
                      <span className="text-xs text-[#7A8A7C]">bu</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.acres || ""}
                        onChange={(e) => updateInventoryItem(index, "acres", Number(e.target.value))}
                        placeholder="Acres"
                        className="w-24 text-sm border border-[#E4E7E0] rounded-[8px] px-2 py-1.5 outline-none focus:border-[#4A7C59]"
                      />
                      <span className="text-xs text-[#7A8A7C]">ac ×</span>
                      <input
                        type="number"
                        value={item.aph || ""}
                        onChange={(e) => updateInventoryItem(index, "aph", Number(e.target.value))}
                        placeholder="APH bu/ac"
                        className="w-28 text-sm border border-[#E4E7E0] rounded-[8px] px-2 py-1.5 outline-none focus:border-[#4A7C59]"
                      />
                      <span className="text-xs text-[#7A8A7C]">bu/ac</span>
                      {item.acres && item.aph ? (
                        <span className="text-xs font-semibold text-[#4A7C59]">
                          = {((item.acres || 0) * (item.aph || 0)).toLocaleString()} bu
                        </span>
                      ) : null}
                    </div>
                  )}

                  <button
                    onClick={() => removeCrop(index)}
                    className="text-xs text-[#D94F3D] hover:text-red-700 ml-auto"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addCrop}
                className="text-xs font-semibold text-[#4A7C59] hover:text-[#3d6b4a]"
              >
                + Add Crop
              </button>
            </div>

            <button
              onClick={saveProfile}
              className="flex items-center gap-2 bg-[#4A7C59] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#3d6b4a] transition-colors"
            >
              <Save size={14} /> Save Farm Profile
            </button>
          </div>
        )}

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
            <div className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center shrink-0 mt-1">
              <Bot size={14} className="text-white" />
            </div>
            <div className="max-w-2xl bg-white border border-[#E4E7E0] rounded-[16px] px-5 py-4 text-[#222527]">
              <MessageContent content={streamingText} />
              <span className="inline-block w-1.5 h-3.5 bg-[#4A7C59] ml-0.5 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

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