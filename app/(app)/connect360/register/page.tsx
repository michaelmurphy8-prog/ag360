'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe, Truck, Sprout, Users, ChevronLeft,
  CheckCircle, Upload, AlertCircle, Briefcase
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type ProviderType = 'trucker' | 'applicator' | 'worker'

interface FormData {
  type: ProviderType | ''
  first_name: string
  last_name: string
  email: string
  phone: string
  business_name: string
  business_number: string
  insurance_confirmed: boolean
  licence_number: string
  licence_province: string
  base_province: string
  base_city: string
  base_country: string
  base_country_other: string
  service_radius_km: number
  worldwide: boolean
  province_other: string
  open_to_relocation: boolean
  work_countries: string[]
  bio: string
  years_experience: number | ''
  equipment_owned: string
  crops_experienced: string[]
  operations_experience: string[]
  equipment_brands: string[]
  availability: string
}

// ─── Constants ────────────────────────────────────────────────
const TYPE_OPTIONS = [
  {
    value: 'trucker',
    label: 'Custom Trucker',
    icon: Truck,
    desc: 'Grain hauling, bulk transport, on-farm logistics',
    color: 'text-blue-400',
    border: 'border-blue-400/40',
    bg: 'bg-blue-400/10',
  },
  {
    value: 'applicator',
    label: 'Custom Applicator',
    icon: Sprout,
    desc: 'Crop spraying, fertilizer application, custom field work',
    color: 'text-green-400',
    border: 'border-green-400/40',
    bg: 'bg-green-400/10',
  },
  {
    value: 'worker',
    label: 'Full Time & Seasonal Worker',
    icon: Users,
    desc: 'Harvest labour, seeding crews, general farm work',
    color: 'text-amber-400',
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/10',
  },
]

const CROP_OPTIONS = [
  'Canola', 'Wheat (HRS)', 'Wheat (Durum)', 'Wheat (CPS)',
  'Barley', 'Oats', 'Peas', 'Lentils', 'Chickpeas',
  'Flax', 'Mustard', 'Soybeans', 'Corn', 'Other',
]

const OPERATIONS_OPTIONS = [
  'Seeding',
  'Spraying / Chemical Application',
  'Haying & Baling',
  'Swathing',
  'Combine Harvesting',
  'Grain Cart Operation',
  'Land Rolling & Rock Picking',
  'Grain Hauling & Trucking',
  'Fabricating & Mechanical',
  'Chemical Mixing / Water Tender',
  'Fencing',
  'Irrigation',
  'Livestock Handling',
  'Silage & Forage',
  'General Yard & Field Work',
  'Other',
]

const EQUIPMENT_BRAND_OPTIONS = [
  // Manufacturers
  'John Deere',
  'Case IH',
  'New Holland',
  'AGCO / Fendt',
  'Claas',
  'Versatile',
  'MacDon',
  'Bourgault',
  'Morris Industries',
  'Horsch',
  'Seed Hawk',
  'Salford',
  'Buhler / Farm King',
  // GPS & Precision Ag
  'John Deere Operations Center',
  'CNH AFS',
  'Trimble',
  'AgLeader',
  'Raven',
  'Topcon',
  'Precision Planting',
  // Mobile / Software
  'Climate FieldView',
  'Bushel Farm',
  'Granular',
  'AG360',
  'FarmLogs',
]

const CANADIAN_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const WORK_COUNTRY_OPTIONS = ['Canada', 'USA', 'Australia', 'New Zealand', 'UK', 'Germany', 'France', 'Ireland', 'Colombia', 'Brazil', 'Other']

const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm text-ag-primary outline-none transition-all
  focus:border-[var(--ag-accent)] placeholder:text-ag-muted`
const inputStyle = { borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }

// ─── Main Component ───────────────────────────────────────────
export default function RegisterProviderPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)

  const [form, setForm] = useState<FormData>({
    type: '',
    first_name: '', last_name: '', email: '', phone: '',
    business_name: '', business_number: '',
    insurance_confirmed: false,
    licence_number: '', licence_province: '',
    base_province: '', base_city: '', base_country: 'Canada',
    base_country_other: '',
    service_radius_km: 250,
    worldwide: false,
    province_other: '',
    open_to_relocation: false,
    work_countries: ['Canada'],
    bio: '', years_experience: '',
    equipment_owned: '', crops_experienced: [],
    operations_experience: [], equipment_brands: [],
    availability: 'immediate',
  })

  function set(key: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleItem(key: 'crops_experienced' | 'operations_experience' | 'equipment_brands' | 'work_countries', val: string) {
    const arr = form[key] as string[]
    set(key, arr.includes(val) ? arr.filter(c => c !== val) : [...arr, val])
  }

  function canAdvance() {
    if (step === 1) return !!form.type
    if (step === 2) return !!(form.first_name && form.last_name && form.email)
    if (step === 3) return !!(form.base_city && (form.base_province || form.province_other || !['Canada', 'USA'].includes(form.base_country)))
    if (step === 4) return !!form.bio.trim()
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      let cv_url: string | null = null
      if (cvFile) {
        const fd = new FormData()
        fd.append('file', cvFile)
        const uploadRes = await fetch('/api/connect360/upload-cv', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          setError(uploadData.error ?? 'CV upload failed. Please try again.')
          setSubmitting(false)
          return
        }
        cv_url = uploadData.url
      }

      const res = await fetch('/api/connect360/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          base_country: form.base_country === 'Other' ? form.base_country_other : form.base_country,
          base_province: form.base_province === 'Other' ? form.province_other : form.base_province,
          years_experience: form.years_experience === '' ? null : Number(form.years_experience),
          cv_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: 'var(--ag-accent)/20' }}>
            <CheckCircle size={32} className="text-[var(--ag-accent)]" />
          </div>
          <h2 className="text-xl font-bold text-ag-primary">Profile Submitted</h2>
          <p className="text-sm text-ag-muted">
            Your profile is under review. AG360 manually verifies all providers
            before they appear in the directory. You'll be contacted at{' '}
            <span className="text-ag-primary font-medium">{form.email}</span> once approved.
          </p>
          <p className="text-xs text-ag-muted">
            Questions? Contact <a href="mailto:mike@ag360.farm" className="text-[var(--ag-accent)]">mike@ag360.farm</a>
          </p>
          <button
            onClick={() => router.push('/connect360')}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}
          >
            Back to Connect360
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/connect360')}
          className="p-2 rounded-lg hover:bg-[var(--ag-bg-hover)] transition-all">
          <ChevronLeft size={18} className="text-ag-muted" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-ag-primary">Register as a Provider</h1>
          <p className="text-xs text-ag-muted">Step {step} of 4 — {
            step === 1 ? 'Provider Type' :
            step === 2 ? 'Personal & Business Info' :
            step === 3 ? 'Location & Availability' :
            'Experience & Details'
          }</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex-1 h-1 rounded-full transition-all"
            style={{ backgroundColor: s <= step ? 'var(--ag-accent)' : 'var(--ag-border)' }} />
        ))}
      </div>

      {/* Step 1 — Type selection */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-ag-muted">What best describes the service you provide?</p>
          {TYPE_OPTIONS.map(opt => {
            const Icon = opt.icon
            const selected = form.type === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set('type', opt.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selected ? `${opt.border} ${opt.bg}` : ''}`}
                style={{
                  borderColor: selected ? undefined : 'var(--ag-border)',
                  backgroundColor: selected ? undefined : 'var(--ag-bg-card)',
                }}
              >
                <div className={`p-2.5 rounded-lg ${selected ? opt.bg : ''}`}
                  style={{ backgroundColor: selected ? undefined : 'var(--ag-bg-hover)' }}>
                  <Icon size={20} className={opt.color} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-ag-primary">{opt.label}</div>
                  <div className="text-xs text-ag-muted">{opt.desc}</div>
                </div>
                {selected && <CheckCircle size={16} className={`ml-auto ${opt.color}`} />}
              </button>
            )
          })}
        </div>
      )}

      {/* Step 2 — Personal & Business Info */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">First Name *</label>
              <input className={inputClass} style={inputStyle}
                value={form.first_name} onChange={e => set('first_name', e.target.value)}
                placeholder="John" />
            </div>
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">Last Name *</label>
              <input className={inputClass} style={inputStyle}
                value={form.last_name} onChange={e => set('last_name', e.target.value)}
                placeholder="Smith" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Email Address *</label>
            <input className={inputClass} style={inputStyle} type="email"
              value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="john@example.com" />
          </div>

          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Phone Number</label>
            <input className={inputClass} style={inputStyle} type="tel"
              value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+1 (306) 555-0000" />
          </div>

          {/* Business fields — truckers and applicators only */}
          {(form.type === 'trucker' || form.type === 'applicator') && (
            <>
              <div>
                <label className="block text-xs text-ag-muted mb-1.5">Business / Company Name</label>
                <input className={inputClass} style={inputStyle}
                  value={form.business_name} onChange={e => set('business_name', e.target.value)}
                  placeholder="Smith Trucking Ltd." />
              </div>

              <div>
                <label className="block text-xs text-ag-muted mb-1.5">Business Registration Number</label>
                <input className={inputClass} style={inputStyle}
                  value={form.business_number} onChange={e => set('business_number', e.target.value)}
                  placeholder="GST / HST / BN" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-ag-muted mb-1.5">
                    {form.type === 'applicator' ? 'Pesticide Licence #' : 'Commercial Licence #'}
                  </label>
                  <input className={inputClass} style={inputStyle}
                    value={form.licence_number} onChange={e => set('licence_number', e.target.value)}
                    placeholder="Licence number" />
                </div>
                <div>
                  <label className="block text-xs text-ag-muted mb-1.5">Issuing Province</label>
                  <select className={inputClass} style={inputStyle}
                    value={form.licence_province} onChange={e => set('licence_province', e.target.value)}>
                    <option value="">Select province</option>
                    {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                style={{ borderColor: form.insurance_confirmed ? 'var(--ag-accent-border)' : 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
                <input type="checkbox" className="mt-0.5"
                  checked={form.insurance_confirmed}
                  onChange={e => set('insurance_confirmed', e.target.checked)} />
                <div>
                  <div className="text-sm text-ag-primary font-medium">Insurance Confirmed</div>
                  <div className="text-xs text-ag-muted">I confirm I carry adequate commercial insurance for the services I provide</div>
                </div>
              </label>
            </>
          )}
        </div>
      )}

      {/* Step 3 — Location & Availability */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Base Country */}
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Base Country *</label>
            <select className={inputClass} style={inputStyle}
              value={form.base_country} onChange={e => set('base_country', e.target.value)}>
              <option value="Canada">Canada</option>
              <option value="USA">United States</option>
              <option value="Australia">Australia</option>
              <option value="New Zealand">New Zealand</option>
              <option value="UK">United Kingdom</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Ireland">Ireland</option>
              <option value="Wales">Wales</option>
              <option value="Scotland">Scotland</option>
              <option value="Colombia">Colombia</option>
              <option value="Brazil">Brazil</option>
              <option value="South Africa">South Africa</option>
              <option value="Other">Other</option>
            </select>
            {form.base_country === 'Other' && (
              <input className={`${inputClass} mt-2`} style={inputStyle}
                value={form.base_country_other}
                onChange={e => set('base_country_other', e.target.value)}
                placeholder="Specify your country" />
            )}
          </div>

          {/* City + Province/State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">Base City / Town *</label>
              <input className={inputClass} style={inputStyle}
                value={form.base_city} onChange={e => set('base_city', e.target.value)}
                placeholder="Swift Current" />
            </div>
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">
                {['Canada', 'USA'].includes(form.base_country) ? 'Province / State *' : 'Region / County'}
              </label>
              {['Canada', 'USA'].includes(form.base_country) ? (
                <select className={inputClass} style={inputStyle}
                  value={form.base_province} onChange={e => set('base_province', e.target.value)}>
                  <option value="">Select...</option>
                  <optgroup label="Canadian Provinces">
                    {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                  <optgroup label="US States">
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <input className={inputClass} style={inputStyle}
                  value={form.province_other} onChange={e => set('province_other', e.target.value)}
                  placeholder="Region / County (optional)" />
              )}
              {form.base_province === 'Other' && ['Canada', 'USA'].includes(form.base_country) && (
                <input className={`${inputClass} mt-2`} style={inputStyle}
                  value={form.province_other} onChange={e => set('province_other', e.target.value)}
                  placeholder="Specify your region" />
              )}
            </div>
          </div>

          {/* Service Radius */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-ag-muted">
                Service Radius —{' '}
                <span className="text-ag-primary font-medium">
                  {form.worldwide ? 'Worldwide' : `${form.service_radius_km} km`}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.worldwide}
                  onChange={e => set('worldwide', e.target.checked)} />
                <span className="text-xs text-ag-muted">Worldwide</span>
              </label>
            </div>
            {!form.worldwide && (
              <>
                <input type="range" min={50} max={2000} step={50}
                  value={form.service_radius_km}
                  onChange={e => set('service_radius_km', Number(e.target.value))}
                  className="w-full accent-[var(--ag-accent)]" />
                <div className="flex justify-between text-[10px] text-ag-muted mt-1">
                  <span>50 km</span><span>500 km</span><span>1,000 km</span><span>2,000 km</span>
                </div>
              </>
            )}
          </div>

          {/* Work countries */}
          <div>
            <label className="block text-xs text-ag-muted mb-2">Countries I'm willing to work in</label>
            <div className="flex flex-wrap gap-2">
              {WORK_COUNTRY_OPTIONS.map(c => (
                <button key={c} type="button"
                  onClick={() => toggleItem('work_countries', c)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{
                    borderColor: form.work_countries.includes(c) ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                    backgroundColor: form.work_countries.includes(c) ? 'var(--ag-bg-active)' : 'var(--ag-bg-hover)',
                    color: form.work_countries.includes(c) ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Open to relocation */}
          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
            style={{ borderColor: form.open_to_relocation ? 'var(--ag-accent-border)' : 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
            <input type="checkbox" checked={form.open_to_relocation}
              onChange={e => set('open_to_relocation', e.target.checked)} />
            <div>
              <div className="text-sm text-ag-primary font-medium">Open to Relocation</div>
              <div className="text-xs text-ag-muted">I'm willing to relocate for the right opportunity</div>
            </div>
          </label>

          {/* Availability */}
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Current Availability</label>
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
          </div>
        </div>
      )}

      {/* Step 4 — Experience & Details */}
      {step === 4 && (
        <div className="space-y-5">
          {/* Years + Bio */}
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">Years of Experience</label>
            <input className={inputClass} style={inputStyle} type="number" min={0} max={60}
              value={form.years_experience}
              onChange={e => set('years_experience', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 12" />
          </div>

          <div>
            <label className="block text-xs text-ag-muted mb-1.5">
              Bio / About You <span className="text-red-400">*</span>
            </label>
            <textarea className={inputClass} style={inputStyle} rows={4}
              value={form.bio} onChange={e => set('bio', e.target.value)}
              placeholder="Describe your experience, what you offer, and what makes you a great hire. This is what farmers see first — make it count." />
            {!form.bio.trim() && (
              <p className="text-xs text-ag-muted mt-1">Required before submitting.</p>
            )}
          </div>

          {/* Equipment owned — truckers + applicators */}
          {(form.type === 'trucker' || form.type === 'applicator') && (
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">Equipment Owned</label>
              <input className={inputClass} style={inputStyle}
                value={form.equipment_owned} onChange={e => set('equipment_owned', e.target.value)}
                placeholder="e.g. 2x B-train, 2023 Peterbilt 389, 140' Hagie sprayer" />
            </div>
          )}

          {/* Crops Experienced */}
          <div>
            <label className="block text-xs text-ag-muted mb-2">Crops Experienced With</label>
            <div className="flex flex-wrap gap-2">
              {CROP_OPTIONS.map(crop => (
                <button key={crop} type="button"
                  onClick={() => toggleItem('crops_experienced', crop)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{
                    borderColor: form.crops_experienced.includes(crop) ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                    backgroundColor: form.crops_experienced.includes(crop) ? 'var(--ag-bg-active)' : 'var(--ag-bg-hover)',
                    color: form.crops_experienced.includes(crop) ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                  }}>
                  {crop}
                </button>
              ))}
            </div>
          </div>

          {/* Operations Experience */}
          <div>
            <label className="block text-xs text-ag-muted mb-1">Operations Experience</label>
            <p className="text-[11px] text-ag-dim mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {OPERATIONS_OPTIONS.map(op => (
                <button key={op} type="button"
                  onClick={() => toggleItem('operations_experience', op)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{
                    borderColor: form.operations_experience.includes(op) ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                    backgroundColor: form.operations_experience.includes(op) ? 'var(--ag-bg-active)' : 'var(--ag-bg-hover)',
                    color: form.operations_experience.includes(op) ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                  }}>
                  {op}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment & Brand Experience */}
          <div>
            <label className="block text-xs text-ag-muted mb-1">Equipment & Brand Experience</label>
            <p className="text-[11px] text-ag-dim mb-2">Manufacturers, GPS systems, and farm software</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_BRAND_OPTIONS.map(brand => (
                <button key={brand} type="button"
                  onClick={() => toggleItem('equipment_brands', brand)}
                  className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                  style={{
                    borderColor: form.equipment_brands.includes(brand) ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                    backgroundColor: form.equipment_brands.includes(brand) ? 'var(--ag-bg-active)' : 'var(--ag-bg-hover)',
                    color: form.equipment_brands.includes(brand) ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                  }}>
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* CV Upload — workers only */}
          {form.type === 'worker' && (
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">
                CV / Résumé <span className="text-ag-dim">(Optional — PDF, DOC, DOCX, max 5MB)</span>
              </label>
              {cvFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ borderColor: 'var(--ag-accent-border)', backgroundColor: 'var(--ag-bg-active)' }}>
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-ag-accent" />
                    <span className="text-sm text-ag-primary truncate max-w-[200px]">{cvFile.name}</span>
                    <span className="text-xs text-ag-muted">({(cvFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button type="button" onClick={() => setCvFile(null)}
                    className="text-xs text-ag-muted hover:text-red-400 transition-all">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-4 rounded-lg border border-dashed cursor-pointer transition-all hover:border-[var(--ag-accent-border)]"
                  style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
                  <Upload size={16} className="text-ag-muted" />
                  <span className="text-sm text-ag-muted">Click to upload your CV</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={e => setCvFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-red-400/30 bg-red-400/10">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/connect360')}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: canAdvance() ? 'var(--ag-accent)' : 'var(--ag-bg-hover)',
              color: canAdvance() ? 'var(--ag-bg-primary)' : 'var(--ag-text-muted)',
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
            }}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canAdvance()}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: canAdvance() ? 'var(--ag-accent)' : 'var(--ag-bg-hover)',
              color: canAdvance() ? 'var(--ag-bg-primary)' : 'var(--ag-text-muted)',
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        )}
      </div>
    </div>
  )
}