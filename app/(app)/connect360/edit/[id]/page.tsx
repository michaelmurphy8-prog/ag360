'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ChevronLeft, RefreshCw, CheckCircle, Upload } from 'lucide-react'

const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm text-ag-primary outline-none transition-all focus:border-[var(--ag-accent-border)]`
const inputStyle = { borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const COUNTRIES = ['Canada', 'United States', 'Mexico', 'Australia', 'New Zealand', 'Other']

interface ProfileForm {
  phone: string
  business_name: string
  bio: string
  base_city: string
  base_province: string
  base_country: string
  service_radius_km: number | ''
  open_to_relocation: boolean
  years_experience: number | ''
  equipment_owned: string
  crops_experienced: string
  availability: string
  available_from: string
  available_to: string
  cv_url: string
}

export default function EditProviderProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { userId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [profileType, setProfileType] = useState('')
  const [uploadingCv, setUploadingCv] = useState(false)

  const [form, setForm] = useState<ProfileForm>({
    phone: '',
    business_name: '',
    bio: '',
    base_city: '',
    base_province: '',
    base_country: 'Canada',
    service_radius_km: 250,
    open_to_relocation: false,
    years_experience: '',
    equipment_owned: '',
    crops_experienced: '',
    availability: 'immediate',
    available_from: '',
    available_to: '',
    cv_url: '',
  })

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  useEffect(() => {
    if (!id) return
    fetch(`/api/connect360/profiles/${id}`)
      .then(r => r.json())
      .then(data => {
        const p = data.profile
        if (!p) { router.push('/connect360'); return }
        // Owner check
        if (p.clerk_user_id !== userId) { router.push(`/connect360/profile/${id}`); return }
        setProfileType(p.type)
        setForm({
          phone: p.phone ?? '',
          business_name: p.business_name ?? '',
          bio: p.bio ?? '',
          base_city: p.base_city ?? '',
          base_province: p.base_province ?? '',
          base_country: p.base_country ?? 'Canada',
          service_radius_km: p.service_radius_km ?? 250,
          open_to_relocation: p.open_to_relocation ?? false,
          years_experience: p.years_experience ?? '',
          equipment_owned: p.equipment_owned ?? '',
          crops_experienced: (p.crops_experienced ?? []).join(', '),
          availability: p.availability ?? 'immediate',
          available_from: p.available_from ?? '',
          available_to: p.available_to ?? '',
          cv_url: p.cv_url ?? '',
        })
      })
      .catch(() => router.push('/connect360'))
      .finally(() => setLoading(false))
  }, [id, userId, router])

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCv(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/connect360/upload-cv', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) set('cv_url', data.url)
    } catch {
      setError('CV upload failed.')
    } finally {
      setUploadingCv(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/connect360/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          crops_experienced: form.crops_experienced
            ? form.crops_experienced.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          years_experience: form.years_experience === '' ? null : Number(form.years_experience),
          service_radius_km: form.service_radius_km === '' ? null : Number(form.service_radius_km),
          available_from: form.available_from || null,
          available_to: form.available_to || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-ag-muted" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/connect360/profile/${id}`)}
          className="p-2 rounded-lg border transition-all hover:border-[var(--ag-accent-border)]"
          style={{ borderColor: 'var(--ag-border)' }}>
          <ChevronLeft size={16} className="text-ag-muted" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-ag-primary">Edit Profile</h1>
          <p className="text-xs text-ag-muted">Updates are live immediately after saving</p>
        </div>
      </div>

      {/* Contact */}
      <div className="p-5 rounded-xl border space-y-4"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        <h2 className="text-sm font-semibold text-ag-primary">Contact & Business</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Phone</label>
            <input className={inputClass} style={inputStyle} type="tel"
              value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+1 (306) 000-0000" />
          </div>
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Business Name</label>
            <input className={inputClass} style={inputStyle}
              value={form.business_name} onChange={e => set('business_name', e.target.value)}
              placeholder="Your business name" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-ag-muted mb-1.5">Professional Bio</label>
          <textarea className={inputClass} style={inputStyle} rows={4}
            value={form.bio} onChange={e => set('bio', e.target.value)}
            placeholder="Describe your experience, services, and what makes you stand out..." />
        </div>
      </div>

      {/* Location */}
      <div className="p-5 rounded-xl border space-y-4"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        <h2 className="text-sm font-semibold text-ag-primary">Location & Coverage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">City</label>
            <input className={inputClass} style={inputStyle}
              value={form.base_city} onChange={e => set('base_city', e.target.value)}
              placeholder="e.g. Swift Current" />
          </div>
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Province</label>
            <select className={inputClass} style={inputStyle}
              value={form.base_province} onChange={e => set('base_province', e.target.value)}>
              <option value="">Select...</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Country</label>
            <select className={inputClass} style={inputStyle}
              value={form.base_country} onChange={e => set('base_country', e.target.value)}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Service Radius (km)</label>
            <input className={inputClass} style={inputStyle} type="number" min={0}
              value={form.service_radius_km}
              onChange={e => set('service_radius_km', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 250" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <button type="button"
              onClick={() => set('open_to_relocation', !form.open_to_relocation)}
              className={`w-10 h-5 rounded-full transition-all relative ${form.open_to_relocation ? 'bg-[var(--ag-accent)]' : 'bg-[var(--ag-bg-hover)]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.open_to_relocation ? 'left-5' : 'left-0.5'}`} />
            </button>
            <label className="text-sm text-ag-secondary">Open to relocation</label>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="p-5 rounded-xl border space-y-4"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        <h2 className="text-sm font-semibold text-ag-primary">Availability</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'immediate', label: 'Available Now', color: 'text-green-400' },
            { value: 'seasonal', label: 'Seasonal', color: 'text-amber-400' },
            { value: 'contract', label: 'Contract Only', color: 'text-blue-400' },
            { value: 'unavailable', label: 'Unavailable', color: 'text-ag-muted' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => set('availability', opt.value)}
              className="flex items-center gap-2 p-3 rounded-lg border text-sm transition-all text-left"
              style={{
                borderColor: form.availability === opt.value ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                backgroundColor: form.availability === opt.value ? 'var(--ag-bg-active)' : 'var(--ag-bg-card)',
              }}>
              <div className={`w-2 h-2 rounded-full ${opt.color} bg-current`} />
              <span className={form.availability === opt.value ? 'text-ag-primary' : 'text-ag-muted'}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
        {(form.availability === 'seasonal' || form.availability === 'contract') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-ag-dim mb-1">Available From</label>
              <input type="date" className={inputClass} style={inputStyle}
                value={form.available_from} onChange={e => set('available_from', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] text-ag-dim mb-1">Available To</label>
              <input type="date" className={inputClass} style={inputStyle}
                value={form.available_to} onChange={e => set('available_to', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="p-5 rounded-xl border space-y-4"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        <h2 className="text-sm font-semibold text-ag-primary">Experience & Equipment</h2>
        <div>
          <label className="block text-xs text-ag-muted mb-1.5">Years of Experience</label>
          <input className={inputClass} style={inputStyle} type="number" min={0} max={60}
            value={form.years_experience}
            onChange={e => set('years_experience', e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="e.g. 12" />
        </div>
        <div>
          <label className="block text-xs text-ag-muted mb-1.5">Equipment Owned</label>
          <input className={inputClass} style={inputStyle}
            value={form.equipment_owned} onChange={e => set('equipment_owned', e.target.value)}
            placeholder="e.g. John Deere S780, Case IH 7250" />
        </div>
        <div>
          <label className="block text-xs text-ag-muted mb-1.5">Crops Experienced <span className="text-ag-dim">(comma separated)</span></label>
          <input className={inputClass} style={inputStyle}
            value={form.crops_experienced} onChange={e => set('crops_experienced', e.target.value)}
            placeholder="e.g. Wheat, Canola, Lentils" />
        </div>
      </div>

      {/* CV Upload — workers + professionals only */}
      {(profileType === 'worker' || profileType === 'professional') && (
        <div className="p-5 rounded-xl border space-y-3"
          style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
          <h2 className="text-sm font-semibold text-ag-primary">CV / Resume</h2>
          {form.cv_url && (
            <a href={form.cv_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-ag-accent hover:underline">
              View current CV →
            </a>
          )}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all hover:border-[var(--ag-accent-border)] w-fit"
            style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
            {uploadingCv
              ? <><RefreshCw size={13} className="animate-spin" /> Uploading...</>
              : <><Upload size={13} /> {form.cv_url ? 'Replace CV' : 'Upload CV'}</>}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={handleCvUpload} disabled={uploadingCv} />
          </label>
          <p className="text-[10px] text-ag-dim">PDF, DOC, or DOCX. Max 5MB.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-400/30 bg-red-400/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 pb-8">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)', opacity: saving ? 0.7 : 1 }}>
          {saving
            ? <><RefreshCw size={14} className="animate-spin" /> Saving...</>
            : saved
            ? <><CheckCircle size={14} /> Saved</>
            : 'Save Changes'}
        </button>
        <button onClick={() => router.push(`/connect360/profile/${id}`)}
          className="px-6 py-3 rounded-xl text-sm border transition-all"
          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}