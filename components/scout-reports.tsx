'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Camera, Plus, Trash2, Leaf, X, ChevronDown, ChevronUp, Loader2, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoutEntry {
  id: string
  date: string
  field_name: string | null
  crop: string | null
  growth_stage: string | null
  issue_type: string | null
  severity: string | null
  symptoms: string[] | null
  notes: string | null
  recommendation: string | null
  created_at: string
}

interface ScoutPhoto {
  id: string
  scout_entry_id: string
  image_url: string
  file_name: string | null
  analysis: Analysis | null
  analyzed_at: string | null
  created_at: string
}

interface Detection {
  category: string
  label: string
  severity: string
  confidence: number
  why: string[]
}

interface ProductRecommendation {
  product: string
  active_ingredient: string
  group: string
  rate: string
  water_volume?: string
  timing?: string
  phi_days?: number
  precautions?: string[]
  tank_mix_notes?: string
}

interface Analysis {
  summary: string
  detections: Detection[]
  recommended_actions: string[]
  what_to_check_next: string[]
  product_recommendations?: ProductRecommendation[]
  spray_water_checklist?: {
    triggered: boolean
    questions: string[]
    notes: string[]
  }
  references: { title: string; type: string; note: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROWTH_STAGES = [
  'Pre-emergence', 'Cotyledon', '1-2 leaf', '3-4 leaf', '5-6 leaf', 'Rosette',
  'Bolting / Stem elongation', 'Budding / Heading', 'Flowering', 'Pod fill / Grain fill',
  'Maturity / Senescence',
]

const ISSUE_TYPES = ['insect', 'disease', 'weed', 'nutrient', 'abiotic_stress', 'other']

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
]

const SYMPTOM_OPTIONS = [
  'Holes / Defoliation', 'Wilting / Lodging', 'Stunted Growth', 'Yellowing / Chlorosis',
  'Lesions / Spots', 'Mould / Fungal growth', 'Pod / Head damage', 'Stem damage',
  'Root damage', 'Leaf curling', 'Discolouration', 'Premature ripening', 'Other',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoutReports({ crops }: { crops: { name: string }[] }) {
  const { user } = useUser()
  const [entries, setEntries] = useState<ScoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    field_name: '',
    crop: '',
    growth_stage: '',
    issue_type: '',
    severity: '',
    symptoms: [] as string[],
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchEntries() }, [user?.id])

  async function fetchEntries() {
    try {
      const res = await fetch('/api/scout/entries')
      const json = await res.json()
      if (json.entries) setEntries(json.entries)
    } catch { console.error('Failed to fetch scout entries') }
    finally { setLoading(false) }
  }

  async function saveEntry() {
    if (!form.date) return
    setSaving(true)
    try {
      const res = await fetch('/api/scout/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.entry) {
        setEntries(prev => [json.entry, ...prev])
        setForm({ date: new Date().toISOString().split('T')[0], field_name: '', crop: '', growth_stage: '', issue_type: '', severity: '', symptoms: [], notes: '' })
        setShowForm(false)
        setExpandedEntry(json.entry.id)
      }
    } catch { console.error('Failed to save entry') }
    finally { setSaving(false) }
  }

  async function deleteEntry(id: string) {
    try {
      await fetch(`/api/scout/entries?id=${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== id))
      if (expandedEntry === id) setExpandedEntry(null)
    } catch { console.error('Failed to delete entry') }
  }

  function toggleSymptom(symptom: string) {
    setForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#222527]">Scout Reports</h2>
          <p className="text-xs text-[#7A8A7C]">Log field observations with photos — ask Lily for instant diagnosis.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-[#4A7C59] text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#3d6b4a] transition-colors"
        >
          <Plus size={14} /> Add Scout Report
        </button>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <div className="bg-white border border-[#4A7C59]/30 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#222527]">New Scout Report</h3>
            <button onClick={() => setShowForm(false)} className="text-[#7A8A7C] hover:text-[#222527]"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full text-sm border border-[#E4E7E0] rounded-lg px-2.5 py-2 bg-white text-[#222527] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30" />
            </div>
            <div>
              <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Field</label>
              <input type="text" placeholder="e.g. North Quarter" value={form.field_name} onChange={e => setForm(p => ({ ...p, field_name: e.target.value }))}
                className="w-full text-sm border border-[#E4E7E0] rounded-lg px-2.5 py-2 bg-white text-[#222527] placeholder:text-[#7A8A7C] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30" />
            </div>
            <div>
              <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Crop</label>
              <select value={form.crop} onChange={e => setForm(p => ({ ...p, crop: e.target.value }))}
                className="w-full text-sm border border-[#E4E7E0] rounded-lg px-2.5 py-2 bg-white text-[#222527] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30">
                <option value="">Select...</option>
                {crops.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Growth Stage</label>
              <select value={form.growth_stage} onChange={e => setForm(p => ({ ...p, growth_stage: e.target.value }))}
                className="w-full text-sm border border-[#E4E7E0] rounded-lg px-2.5 py-2 bg-white text-[#222527] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30">
                <option value="">Select...</option>
                {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Issue Type</label>
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_TYPES.map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, issue_type: t }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${form.issue_type === t ? 'bg-[#4A7C59] text-white' : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'}`}>
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Severity</label>
              <div className="flex gap-1.5">
                {SEVERITY_LEVELS.map(s => (
                  <button key={s.value} onClick={() => setForm(p => ({ ...p, severity: s.value }))}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${form.severity === s.value ? s.color : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Symptoms Observed</label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${form.symptoms.includes(s) ? 'bg-[#4A7C59] text-white' : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional observations..."
              className="w-full text-sm border border-[#E4E7E0] rounded-lg px-2.5 py-2 bg-white text-[#222527] placeholder:text-[#7A8A7C] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30 resize-none" />
          </div>

          <button onClick={saveEntry} disabled={saving || !form.date}
            className="flex items-center gap-1.5 bg-[#4A7C59] text-white text-xs font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a] transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Saving...' : 'Save Report'}
          </button>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div className="text-center py-8 text-[#7A8A7C] text-sm">Loading scout reports...</div>
      ) : entries.length === 0 && !showForm ? (
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-8 text-center">
          <Leaf size={24} className="mx-auto text-[#7A8A7C] mb-2" />
          <p className="text-sm text-[#7A8A7C]">No scout reports yet. Add your first one above.</p>
        </div>
      ) : (
        entries.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            expanded={expandedEntry === entry.id}
            onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
            onDelete={() => deleteEntry(entry.id)}
            onUpdateRecommendation={(rec) => {
              setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, recommendation: rec } : e))
            }}
          />
        ))
      )}
    </div>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, expanded, onToggle, onDelete, onUpdateRecommendation }: {
  entry: ScoutEntry
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onUpdateRecommendation: (rec: string) => void
}) {
  const [photos, setPhotos] = useState<ScoutPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ScoutPhoto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (expanded) fetchPhotos()
  }, [expanded])

  async function fetchPhotos() {
    try {
      const res = await fetch(`/api/scout/photos?entryId=${entry.id}`)
      const json = await res.json()
      if (json.photos) setPhotos(json.photos)
    } catch { console.error('Failed to fetch photos') }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('scout_entry_id', entry.id)
      const res = await fetch('/api/scout/photos/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.photo) setPhotos(prev => [...prev, json.photo])
      else alert(json.error || 'Upload failed')
    } catch { console.error('Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function deletePhoto(photoId: string) {
    try {
      await fetch(`/api/scout/photos?id=${photoId}`, { method: 'DELETE' })
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      if (selectedPhoto?.id === photoId) setSelectedPhoto(null)
    } catch { console.error('Failed to delete photo') }
  }

  const severityColor = entry.severity === 'high' ? 'bg-red-100 text-red-800' : entry.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'

  return (
    <div className="bg-white border border-[#E4E7E0] rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#F9FAF8] transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-xs text-[#7A8A7C] font-medium whitespace-nowrap">{new Date(entry.date).toLocaleDateString('en-CA')}</div>
          {entry.field_name && <span className="text-sm font-medium text-[#222527] truncate">{entry.field_name}</span>}
          {entry.crop && <span className="text-xs bg-[#F5F5F3] border border-[#E4E7E0] px-2 py-0.5 rounded font-medium text-[#7A8A7C]">{entry.crop}</span>}
          {entry.severity && <span className={`text-xs px-2 py-0.5 rounded font-medium ${severityColor}`}>{entry.severity}</span>}
          {entry.issue_type && <span className="text-xs text-[#7A8A7C] capitalize">{entry.issue_type.replace('_', ' ')}</span>}
        </div>
        {expanded ? <ChevronUp size={16} className="text-[#7A8A7C]" /> : <ChevronDown size={16} className="text-[#7A8A7C]" />}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[#E4E7E0] pt-4 space-y-4">
          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {entry.growth_stage && (
              <div><span className="text-xs text-[#7A8A7C] block">Growth Stage</span><span className="text-[#222527]">{entry.growth_stage}</span></div>
            )}
            {entry.symptoms && entry.symptoms.length > 0 && (
              <div className="col-span-2">
                <span className="text-xs text-[#7A8A7C] block mb-1">Symptoms</span>
                <div className="flex flex-wrap gap-1">{entry.symptoms.map(s => (
                  <span key={s} className="text-xs bg-[#F9FAF8] border border-[#E4E7E0] px-2 py-0.5 rounded">{s}</span>
                ))}</div>
              </div>
            )}
            {entry.notes && (
              <div className="col-span-2"><span className="text-xs text-[#7A8A7C] block">Notes</span><span className="text-[#222527] text-sm">{entry.notes}</span></div>
            )}
          </div>

          {entry.recommendation && (
            <div className="bg-[#F0F4ED] border border-[#4A7C59]/20 rounded-lg px-4 py-3">
              <span className="text-xs font-semibold text-[#4A7C59] block mb-1">Recommendation</span>
              <p className="text-sm text-[#222527]">{entry.recommendation}</p>
            </div>
          )}

          {/* Photo Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#222527] uppercase tracking-wide">Photos ({photos.length}/3)</span>
              {photos.length < 3 && (
                <label className="flex items-center gap-1 text-xs font-semibold text-[#4A7C59] hover:text-[#3d6b4a] cursor-pointer transition-colors">
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  {uploading ? 'Uploading...' : 'Add Photo'}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            {photos.length > 0 ? (
              <div className="flex gap-2">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <button onClick={() => setSelectedPhoto(photo)} className="block">
                      <img src={photo.image_url} alt={photo.file_name || 'Scout photo'}
                        className="w-20 h-20 object-cover rounded-lg border border-[#E4E7E0] hover:border-[#4A7C59] transition-colors" />
                    </button>
                    {photo.analyzed_at && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#4A7C59] rounded-full flex items-center justify-center">
                        <CheckCircle size={10} className="text-white" />
                      </div>
                    )}
                    <button onClick={() => deletePhoto(photo.id)}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E4E7E0] rounded-lg p-4 text-center">
                <label className="cursor-pointer">
                  <Camera size={20} className="mx-auto text-[#7A8A7C] mb-1" />
                  <p className="text-xs text-[#7A8A7C]">Tap to take a photo or upload from gallery</p>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
            )}
          </div>

          {/* Photo Detail / Analysis Drawer */}
          {selectedPhoto && (
            <PhotoAnalysisPanel
              photo={selectedPhoto}
              onClose={() => setSelectedPhoto(null)}
              onAnalyzed={(updated) => {
                setPhotos(prev => prev.map(p => p.id === updated.id ? updated : p))
                setSelectedPhoto(updated)
              }}
              onSaveToEntry={(rec) => {
                onUpdateRecommendation(rec)
                fetch('/api/scout/entries', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...entry, recommendation: rec }),
                })
              }}
            />
          )}

          {/* Delete Entry */}
          <div className="pt-2 border-t border-[#E4E7E0] flex justify-end">
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 size={12} /> Delete Report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Photo Analysis Panel ─────────────────────────────────────────────────────

function PhotoAnalysisPanel({ photo, onClose, onAnalyzed, onSaveToEntry }: {
  photo: ScoutPhoto
  onClose: () => void
  onAnalyzed: (photo: ScoutPhoto) => void
  onSaveToEntry: (recommendation: string) => void
}) {
  const [analyzing, setAnalyzing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const analysis = photo.analysis

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/scout/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id }),
      })
      const json = await res.json()
      if (json.analysis) {
        onAnalyzed({ ...photo, analysis: json.analysis, analyzed_at: new Date().toISOString() })
      }
    } catch { console.error('Analysis failed') }
    finally { setAnalyzing(false) }
  }

  function handleSaveToEntry() {
    if (!analysis) return
    const rec = [
      analysis.summary,
      '',
      'Recommended Actions:',
      ...analysis.recommended_actions.map(a => `• ${a}`),
    ].join('\n')
    onSaveToEntry(rec)
  }

  function confidenceColor(c: number) {
    if (c >= 0.8) return 'text-green-700 bg-green-50'
    if (c >= 0.6) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  function categoryIcon(cat: string) {
    switch (cat) {
      case 'insect': return '🐛'
      case 'disease': return '🦠'
      case 'weed': return '🌿'
      case 'nutrient': return '🧪'
      case 'abiotic_stress': return '🌡️'
      case 'growth_stage': return '🌱'
      default: return '❓'
    }
  }

  return (
    <div className="bg-[#F9FAF8] border border-[#E4E7E0] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-[#222527] uppercase tracking-wide">Photo Analysis</span>
        <button onClick={onClose} className="text-[#7A8A7C] hover:text-[#222527]"><X size={14} /></button>
      </div>

      {/* Image */}
      <img src={photo.image_url} alt="Scout photo" className="w-full max-h-64 object-contain rounded-lg border border-[#E4E7E0] bg-white" />

      {/* Ask Lily Button */}
      {!analysis && !analyzing && (
        <button onClick={runAnalysis}
          className="w-full flex items-center justify-center gap-2 bg-[#4A7C59] text-white text-sm font-semibold py-2.5 rounded-full hover:bg-[#3d6b4a] transition-colors">
          <Leaf size={16} /> Ask Lily to Analyze
        </button>
      )}

      {/* Analyzing State */}
      {analyzing && (
        <div className="text-center py-4">
          <Loader2 size={24} className="mx-auto text-[#4A7C59] animate-spin mb-2" />
          <p className="text-sm text-[#7A8A7C]">Lily is analyzing your field photo...</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-white border border-[#E4E7E0] rounded-lg px-4 py-3">
            <p className="text-sm text-[#222527]">{analysis.summary}</p>
          </div>

          {/* Detections */}
          {analysis.detections.length > 0 && (
            <div className="space-y-2">
              {analysis.detections.map((d, i) => (
                <div key={i} className="bg-white border border-[#E4E7E0] rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#222527]">{categoryIcon(d.category)} {d.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${d.severity === 'high' ? 'bg-red-100 text-red-800' : d.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                        {d.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${confidenceColor(d.confidence)}`}>
                        {Math.round(d.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  {d.confidence < 0.6 && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-1">
                      <AlertTriangle size={12} /> Low confidence — confirm with your agronomist or provincial guide
                    </div>
                  )}
                  {showDetails && d.why.length > 0 && (
                    <div className="mt-2 text-xs text-[#7A8A7C] space-y-0.5">
                      {d.why.map((w, j) => <p key={j}>→ {w}</p>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Expand / Collapse Details */}
          <button onClick={() => setShowDetails(!showDetails)} className="text-xs text-[#4A7C59] font-medium flex items-center gap-1">
            {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showDetails ? 'Hide details' : 'Show details'}
          </button>

          {showDetails && (
            <>
              {/* Recommended Actions */}
              {analysis.recommended_actions.length > 0 && (
                <div className="bg-white border border-[#E4E7E0] rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold text-[#222527] block mb-1">Recommended Actions</span>
                  {analysis.recommended_actions.map((a, i) => (
                    <p key={i} className="text-sm text-[#222527] mb-0.5">• {a}</p>
                  ))}
                </div>
              )}

              {/* What to Check Next */}
              {analysis.what_to_check_next.length > 0 && (
                <div className="bg-white border border-[#E4E7E0] rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold text-[#222527] flex items-center gap-1 mb-1"><HelpCircle size={12} /> What to Check Next</span>
                  {analysis.what_to_check_next.map((q, i) => (
                    <p key={i} className="text-sm text-[#7A8A7C] mb-0.5">→ {q}</p>
                  ))}
                </div>
              )}

{/* Product Recommendations */}
              {analysis.product_recommendations && analysis.product_recommendations.length > 0 && (
                <div className="bg-white border border-[#E4E7E0] rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold text-[#222527] block mb-2">🧪 Product Recommendations</span>
                  {analysis.product_recommendations.map((p, i) => (
                    <div key={i} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b border-[#E4E7E0] last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#222527]">{p.product}</span>
                        <span className="text-xs bg-[#F5F5F3] border border-[#E4E7E0] px-2 py-0.5 rounded font-medium text-[#7A8A7C]">Group {p.group}</span>
                      </div>
                      <p className="text-xs text-[#7A8A7C] mb-1">{p.active_ingredient}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                        <div><span className="text-[#7A8A7C]">Rate:</span> <span className="text-[#4A7C59] font-semibold">{p.rate}</span></div>
                        {p.water_volume && <div><span className="text-[#7A8A7C]">Water:</span> <span className="text-[#222527]">{p.water_volume}</span></div>}
                        {p.timing && <div><span className="text-[#7A8A7C]">Timing:</span> <span className="text-[#222527]">{p.timing}</span></div>}
                        {p.phi_days !== undefined && <div><span className="text-[#7A8A7C]">PHI:</span> <span className="text-[#222527]">{p.phi_days} days</span></div>}
                      </div>
                      {p.tank_mix_notes && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5">🔀 {p.tank_mix_notes}</p>
                      )}
                      {p.precautions && p.precautions.length > 0 && (
                        <div className="mt-1.5 text-xs text-[#7A8A7C]">
                          {p.precautions.map((pr, j) => <p key={j}>⚠️ {pr}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-[#7A8A7C] mt-2 italic">Always verify rates and PHI on the registered product label before application.</p>
                </div>
              )}

              {/* Spray Water Checklist */}
              {analysis.spray_water_checklist?.triggered && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold text-amber-800 block mb-1">💧 Water Compatibility</span>
                  {analysis.spray_water_checklist.questions.map((q, i) => (
                    <p key={i} className="text-sm text-amber-700 mb-0.5">? {q}</p>
                  ))}
                  {analysis.spray_water_checklist.notes.map((n, i) => (
                    <p key={i} className="text-xs text-amber-600 mt-1">⚠️ {n}</p>
                  ))}
                </div>
              )}

              {/* References */}
              {analysis.references.length > 0 && (
                <div className="bg-white border border-[#E4E7E0] rounded-lg px-4 py-3">
                  <span className="text-xs font-semibold text-[#222527] block mb-1">📚 References</span>
                  {analysis.references.map((r, i) => (
                    <div key={i} className="text-xs text-[#7A8A7C] mb-1">
                      <span className="font-medium text-[#222527]">{r.title}</span>
                      <span className="ml-1 text-[#7A8A7C] bg-[#F5F5F3] px-1.5 py-0.5 rounded">{r.type}</span>
                      <p className="mt-0.5">{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Save to Entry */}
          <button onClick={handleSaveToEntry}
            className="w-full flex items-center justify-center gap-1.5 bg-[#4A7C59] text-white text-xs font-semibold py-2 rounded-full hover:bg-[#3d6b4a] transition-colors">
            <CheckCircle size={14} /> Save to Report
          </button>

          <p className="text-xs text-[#7A8A7C] text-center">
            ⚠️ Lily provides guidance only — verify all product rates against the registered label before application.
          </p>
        </div>
      )}
    </div>
  )
}