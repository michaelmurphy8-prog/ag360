'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck, Sprout, Users, Briefcase, Tractor, ChevronLeft,
  CheckCircle, Upload, Scale, ArrowRight, RefreshCw
} from 'lucide-react'

// ── Constants (mirrors web register page) ──────────────────────────────────

const CANADIAN_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const WORK_COUNTRY_OPTIONS = ['Canada','USA','Australia','New Zealand','UK','Europe','Worldwide']
const WORKER_ORIGIN_COUNTRIES = ['Philippines','Mexico','Ukraine','Guatemala','Honduras','El Salvador','Jamaica','Thailand','Vietnam','India','Nepal','Colombia','Brazil','South Africa','Kenya','Nigeria','Other']
const LANGUAGES = ['English','French','Spanish','Tagalog','Ukrainian','Portuguese','Hindi','Punjabi','Mandarin','German','Dutch','Other']
const CROP_OPTIONS = ['Wheat','Canola','Barley','Oats','Flax','Peas','Lentils','Chickpeas','Soybeans','Corn','Sunflowers','Potatoes','Sugar Beets','Mustard','Canaryseed','Hemp','Hay','Silage','Specialty Crops']
const OPERATIONS_OPTIONS = ['Seeding','Harvest','Spraying','Fertilizing','Tillage','Swathing','Baling','Trucking','Trucker','Grain Handling','Bin Management','Irrigation','Livestock','Fencing','Welding','Mechanics','GPS / Precision Ag','Drones','Cattle Working','Feeding / Nutrition']
const EQUIPMENT_BRAND_OPTIONS = ['John Deere','Case IH','New Holland','Claas','AGCO','Versatile','Fendt','Challenger','Kinze','White','Morris','Bourgault','Seed Hawk','Vaderstad','CNH','Trimble','Topcon','Raven','Climate FieldView','Ag Leader','Precision Planting','Hagie','Rogator','Apache','Other']
const ALL_PROVINCES_OPTIONS = [...CANADIAN_PROVINCES,...US_STATES]

const PROFESSIONAL_SUB_TYPES = [
  { value: 'immigration_consultant', label: 'Immigration Consultant (RCIC)', desc: 'TFW, LMIA, TFWP, H-2A, farm labour immigration', licenceLabel: 'RCIC Registration Number', licenceHint: 'Verify on ICCRC / CICC', licenceHintUrl: 'https://iccrc-crcic.ca/find-an-rcic/' },
  { value: 'accountant', label: 'Ag Accountant / Tax Advisor', desc: 'Farm tax, AgriStability, succession planning', licenceLabel: 'CPA Registration / Practice Number', licenceHint: 'Verify CPA Canada', licenceHintUrl: 'https://www.cpacanada.ca' },
  { value: 'crop_consultant', label: 'Crop Consultant', desc: 'Agronomy, field scouting, input recommendations', licenceLabel: 'CCA or P.Ag Registration', licenceHint: 'Verify CAFA or ASPB', licenceHintUrl: 'https://www.cafa.ca' },
  { value: 'agrologist', label: 'Agrologist (P.Ag)', desc: 'Regulated agronomy, soil science, crop management', licenceLabel: 'P.Ag Registration Number', licenceHint: 'Verify ASPB or provincial body', licenceHintUrl: 'https://www.aspb.ca' },
  { value: 'recruitment_agency', label: 'Farm Recruitment Agency', desc: 'Labour sourcing, HR, staffing for ag operations', licenceLabel: 'Business Registration Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'lawyer', label: 'Agricultural Lawyer', desc: 'Land transactions, contracts, water rights, estates', licenceLabel: 'Law Society Registration', licenceHint: 'Verify with provincial Law Society', licenceHintUrl: 'https://www.lso.ca' },
  { value: 'insurance_broker', label: 'Ag Insurance Broker', desc: 'Crop insurance, AgriInsurance, hail, farm property', licenceLabel: 'Insurance Licence Number', licenceHint: 'Verify with provincial regulator', licenceHintUrl: '' },
  { value: 'lender', label: 'Farm Lender / Financial Advisor', desc: 'FCC, credit union, farm operating loans, investment', licenceLabel: 'Securities / FSRA Licence', licenceHint: '', licenceHintUrl: '' },
  { value: 'veterinarian', label: 'Veterinarian / Herd Health', desc: 'Livestock health, herd management, vet services', licenceLabel: 'Veterinary Licence Number', licenceHint: 'Verify with provincial college', licenceHintUrl: '' },
  { value: 'environmental', label: 'Environmental Consultant', desc: 'Soil testing, carbon credits, environmental compliance', licenceLabel: 'Professional Registration / Cert', licenceHint: '', licenceHintUrl: '' },
  { value: 'hr_consultant', label: 'HR Consultant', desc: 'Farm HR, hiring, onboarding, compliance, team management', licenceLabel: 'Business Registration Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'fuel_oil', label: 'Fuel, Oil & Lubricants', desc: 'On-farm fuel delivery, bulk oil, lubricant supply', licenceLabel: 'Business Registration Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'construction', label: 'Construction', desc: 'Farm construction, site prep, concrete, earthworks', licenceLabel: 'Business / Contractor Registration', licenceHint: '', licenceHintUrl: '' },
  { value: 'hvac_plumbing', label: 'HVAC & Plumbing', desc: 'Heating, cooling, ventilation, plumbing for farm facilities', licenceLabel: 'Trade Licence Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'mechanic', label: 'Mechanic & Technician', desc: 'Farm equipment repair, diagnostics, welding, mobile service', licenceLabel: 'Trade Certification / Red Seal', licenceHint: '', licenceHintUrl: '' },
  { value: 'buildings_storage', label: 'Buildings & Storage', desc: 'Bins, grain storage, farm buildings, steel structures', licenceLabel: 'Business / Contractor Registration', licenceHint: '', licenceHintUrl: '' },
]

function getServicesForSubType(sub: string): string[] {
  const map: Record<string, string[]> = {
    immigration_consultant: ['LMIA Applications','TFW Program','H-2A Visa','SAWP','Express Entry','PNP','Family Sponsorship','Work Permits','Study Permits','PR Applications'],
    accountant: ['Farm Tax Returns','GST/HST Filing','AgriStability','AgriInvest','Payroll','Succession Planning','Incorporation','Bookkeeping','Financial Statements'],
    crop_consultant: ['Field Scouting','Soil Testing','Fertility Planning','Pest ID','Variety Selection','Seeding Rates','Spray Programs','Yield Analysis'],
    agrologist: ['Soil Health','Nutrient Management','Crop Rotation','Environmental Compliance','Land Evaluation','Agronomic Reports'],
    recruitment_agency: ['Labour Sourcing','TFW Placement','Seasonal Hiring','Permanent Placement','Payroll Services','HR Consulting'],
    lawyer: ['Land Purchase/Sale','Lease Agreements','Wills & Estates','Farm Succession','Water Rights','Litigation','Corporate Structure'],
    insurance_broker: ['Crop Insurance','Hail Insurance','AgriInsurance','Farm Property','Liability','Equipment','Business Interruption'],
    lender: ['Operating Lines','Equipment Financing','Land Loans','FCC Programs','Refinancing','Investment Planning'],
    veterinarian: ['Herd Health Programs','Vaccination','Pregnancy Checking','Feedlot Health','Biosecurity','Nutrition Consulting'],
    environmental: ['Soil Testing','Carbon Credits','Environmental Assessments','Wetland Delineation','Compliance Reporting'],
    hr_consultant: ['Hiring & Recruitment','Onboarding','HR Policies','Payroll Compliance','Performance Management','Workplace Safety','Employment Contracts'],
    fuel_oil: ['On-Farm Fuel Delivery','Bulk Diesel','Bulk Gasoline','Lubricants','DEF Fluid','Propane','Emergency Delivery'],
    construction: ['Site Prep','Concrete Work','Steel Buildings','Earthworks','Road Building','Drainage','Yard Construction'],
    hvac_plumbing: ['Heating Systems','Ventilation','Air Conditioning','Plumbing Install','Repairs & Maintenance','Shop HVAC','Livestock Facility HVAC'],
    mechanic: ['Equipment Repair','Diagnostics','Welding','Mobile Service','Preventive Maintenance','Hydraulics','Electrical'],
    buildings_storage: ['Grain Bins','Bin Floors & Aeration','Farm Buildings','Steel Structures','Hopper Bottoms','Flat Storage','Bin Installation'],
  }
  return map[sub] ?? []
}

const TRANSPORT_SERVICES = ['Grain & Fertilizer Hauling','Oversize & Heavy Haul','Custom Transport','Dry Bulk Loads','Liquid Tankers','Gravel & Sand','AC & Reefer Loads']
const CUSTOM_WORK_SERVICES = ['Crop Spraying','Fertilizer Application','Custom Harvest','Custom Seeding','Drone & Aerial Spraying Services']
const FARMER_SUB_TYPES = ['Grain','Produce','Cattle','Specialty','Horticulture','Aquaculture','Dairy','Viticulture','Citrus & Fruit']

const TYPE_OPTIONS = [
  { value: 'farmer',       label: 'Farmer',                      desc: 'Grain, cattle, produce, dairy, specialty & more',            icon: Tractor,   color: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/30', services: [], glow: true },
  { value: 'worker',       label: 'Full Time & Seasonal Worker', desc: 'Farm labour, equipment operators, livestock handlers',        icon: Users,     color: 'text-blue-400',   bg: 'bg-blue-400/10',    border: 'border-blue-400/30',  services: [] },
  { value: 'trucker',      label: 'Custom Transport',            desc: 'Grain & fertilizer hauling, oversize, bulk, tanker, reefer', icon: Truck,     color: 'text-amber-400',  bg: 'bg-amber-400/10',   border: 'border-amber-400/30', services: TRANSPORT_SERVICES },
  { value: 'applicator',   label: 'Custom Work',                 desc: 'Crop spraying, fertilizer, custom harvest, seeding, drones', icon: Sprout,    color: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/30', services: CUSTOM_WORK_SERVICES },
  { value: 'professional', label: 'Professional Services',       desc: 'Agronomy, immigration, accounting, legal, trades & more',    icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-400/10',  border: 'border-purple-400/30',services: [] },
]

interface FormData {
  type: string
  first_name: string; last_name: string; email: string; phone: string
  business_name: string; business_number: string
  insurance_confirmed: boolean
  licence_number: string; licence_province: string
  base_province: string; base_city: string; base_country: string; base_country_other: string
  service_radius_km: number; worldwide: boolean; province_other: string
  open_to_relocation: boolean; work_countries: string[]
  bio: string; years_experience: string | number; website_url: string
  equipment_owned: string; crops_experienced: string[]
  operations_experience: string[]; equipment_brands: string[]
  holds_licence: boolean; driver_licence_type: string; driver_licence_province: string
  availability: string; available_from: string; available_to: string
  professional_sub_type: string
  farmer_sub_types: string[]
  sponsorship_offered: string[]
  languages_spoken: string[]; services_offered: string[]
  provinces_served: string[]; countries_served: string[]
  remote_service: boolean; worker_origin_countries: string[]
  seeking_tfw_sponsorship: boolean; seeking_h2a_sponsorship: boolean; citizenship_country: string
}

// ── Styles ─────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  border: '1px solid #EEE9E0', backgroundColor: '#FFFFFF',
  color: '#0D1520', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: '#8A9BB0', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }

function Chip({ label, active, onClick, color = '#C9A84C' }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        border: `1px solid ${active ? color : '#EEE9E0'}`,
        backgroundColor: active ? `${color}18` : '#FFFFFF',
        color: active ? color : '#8A9BB0',
      }}>
      {label}
    </button>
  )
}

function CheckRow({ checked, onChange, label, sublabel, color = '#C9A84C' }: { checked: boolean; onChange: (v: boolean) => void; label: string; sublabel?: string; color?: string }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-2xl cursor-pointer"
      style={{ border: `1px solid ${checked ? color + '40' : '#EEE9E0'}`, backgroundColor: checked ? `${color}08` : '#FFFFFF' }}>
      <input type="checkbox" className="mt-0.5 flex-shrink-0" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div>
        <div className="text-sm font-semibold" style={{ color: '#0D1520' }}>{label}</div>
        {sublabel && <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>{sublabel}</div>}
      </div>
    </label>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)

  const [form, setForm] = useState<FormData>({
    type: '', first_name: '', last_name: '', email: '', phone: '',
    business_name: '', business_number: '',
    insurance_confirmed: false, licence_number: '', licence_province: '',
    base_province: '', base_city: '', base_country: 'Canada', base_country_other: '',
    service_radius_km: 250, worldwide: false, province_other: '',
    open_to_relocation: false, work_countries: ['Canada'],
    bio: '', years_experience: '', website_url: '',
    equipment_owned: '', crops_experienced: [], operations_experience: [], equipment_brands: [],
    holds_licence: false, driver_licence_type: '', driver_licence_province: '',
    availability: 'immediate', available_from: '', available_to: '',
    professional_sub_type: '',
    farmer_sub_types: [],
    sponsorship_offered: [],
    languages_spoken: [], services_offered: [], provinces_served: [],
    countries_served: ['Canada'], remote_service: true, worker_origin_countries: [],
    seeking_tfw_sponsorship: false, seeking_h2a_sponsorship: false, citizenship_country: '',
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function toggleItem(key: 'crops_experienced'|'operations_experience'|'equipment_brands'|'work_countries'|'languages_spoken'|'services_offered'|'provinces_served'|'countries_served'|'worker_origin_countries'|'farmer_sub_types'|'sponsorship_offered', val: string) {
    const arr = form[key] as string[]
    set(key, (arr.includes(val) ? arr.filter(c => c !== val) : [...arr, val]) as FormData[typeof key])
  }

  function canAdvance() {
    if (step === 1) return !!form.type
    if (step === 2) {
      const base = !!(form.first_name && form.last_name && form.email)
      if (form.type === 'professional') return base && !!form.professional_sub_type
      return base
    }
    if (step === 3) return !!(form.base_city && (form.base_province || form.province_other || !['Canada','USA'].includes(form.base_country)))
    if (step === 4) return !!form.bio.trim()
    return true
  }

  const subTypeConfig = PROFESSIONAL_SUB_TYPES.find(s => s.value === form.professional_sub_type)

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
        if (!uploadRes.ok) { setError(uploadData.error ?? 'CV upload failed.'); setSubmitting(false); return }
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
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setSubmitted(true)
    } catch { setError('Network error. Please try again.') }
    finally { setSubmitting(false) }
  }

  const stepLabels = ['Provider Type', 'Personal & Business', 'Location & Availability', 'Experience & Details']

  // ── Success ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center"
        style={{ backgroundColor: '#F7F5F0' }}>
        <div className="max-w-sm w-full space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: '#FDF8EE' }}>
            <CheckCircle size={32} style={{ color: '#C9A84C' }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: '#0D1520' }}>Profile Submitted</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#8A9BB0' }}>
            Your profile is under review. AG360 manually verifies all providers before they appear in the directory.
            You'll be contacted at <span style={{ color: '#0D1520', fontWeight: 600 }}>{form.email}</span> once approved.
          </p>
          {form.type === 'professional' && (
            <p className="text-xs px-4 py-3 rounded-2xl" style={{ backgroundColor: '#FDF8EE', color: '#8A9BB0' }}>
              Professional profiles include a licence verification step. Ensure your registration number is accurate.
            </p>
          )}
          <p className="text-xs" style={{ color: '#B0A898' }}>
            Questions? <a href="mailto:mike@ag360.farm" style={{ color: '#C9A84C' }}>mike@ag360.farm</a>
          </p>
          <button onClick={() => router.push('/discover')}
            className="w-full py-3 rounded-2xl text-sm font-bold"
            style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
            Browse providers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10"
        style={{ backgroundColor: '#F7F5F0' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/discover')}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <ChevronLeft size={18} style={{ color: '#0D1520' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold" style={{ color: '#0D1520' }}>Register as a Provider</h1>
            <p className="text-xs" style={{ color: '#8A9BB0' }}>Step {step} of 4 — {stepLabels[step - 1]}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5">
          {[1,2,3,4].map(s => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ backgroundColor: s <= step ? '#C9A84C' : '#EEE9E0' }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-32 space-y-4 mt-2">

        {/* ── Step 1 — Provider Type ── */}
        {step === 1 && (
          <>
            <p className="text-sm" style={{ color: '#8A9BB0' }}>What best describes the service you provide?</p>
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon
              const selected = form.type === opt.value
              return (
                <div key={opt.value} className="rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: selected ? `1px solid #C9A84C` : opt.glow ? `1px solid rgba(34,197,94,0.4)` : `1px solid #EEE9E0`,
                    boxShadow: selected ? '0 2px 16px rgba(201,168,76,0.15)' : opt.glow ? '0 0 0 3px rgba(34,197,94,0.08), 0 2px 12px rgba(34,197,94,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                  }}>
                <button onClick={() => set('type', opt.value)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                  style={{ backgroundColor: 'transparent' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#FDF8EE' }}>
                    <Icon size={20} style={{ color: '#C9A84C' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: '#0D1520' }}>{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>{opt.desc}</div>
                  </div>
                  {selected && <CheckCircle size={18} style={{ color: '#C9A84C', flexShrink: 0 }} />}
                </button>
                {opt.services.length > 0 && selected && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3 -mt-1">
                    {opt.services.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F7F5F0', color: '#8A9BB0', border: '1px solid #EEE9E0' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
            })}
          </>
        )}

        {/* ── Step 2 — Personal & Business Info ── */}
        {step === 2 && (
          <>
            {/* Farmer sub-type picker */}
            {form.type === 'farmer' && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Farm Type <span style={{ color: '#B0A898', textTransform: 'none', fontWeight: 400 }}>(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {FARMER_SUB_TYPES.map(s => (
                    <button key={s} type="button" onClick={() => toggleItem('farmer_sub_types', s)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        border: `1px solid ${form.farmer_sub_types.includes(s) ? '#C9A84C' : '#EEE9E0'}`,
                        backgroundColor: form.farmer_sub_types.includes(s) ? '#FDF8EE' : '#FFFFFF',
                        color: form.farmer_sub_types.includes(s) ? '#C9A84C' : '#8A9BB0',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (306) 555-0000" />
              </div>
            </div>

            {/* Trucker / Applicator */}
            {(form.type === 'trucker' || form.type === 'applicator') && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B0A898' }}>Business Details</div>
                <div>
                  <label style={labelStyle}>Business / Company Name</label>
                  <input style={inputStyle} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Smith Trucking Ltd." />
                </div>
                <div>
                  <label style={labelStyle}>Business Registration Number</label>
                  <input style={inputStyle} value={form.business_number} onChange={e => set('business_number', e.target.value)} placeholder="GST / HST / BN" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>{form.type === 'applicator' ? 'Pesticide Licence #' : 'Commercial Licence #'}</label>
                    <input style={inputStyle} value={form.licence_number} onChange={e => set('licence_number', e.target.value)} placeholder="Licence number" />
                  </div>
                  <div>
                    <label style={labelStyle}>Issuing Province</label>
                    <select style={inputStyle} value={form.licence_province} onChange={e => set('licence_province', e.target.value)}>
                      <option value="">Select...</option>
                      {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <CheckRow checked={form.insurance_confirmed} onChange={v => set('insurance_confirmed', v)}
                  label="Insurance Confirmed"
                  sublabel="I confirm I carry adequate commercial insurance for the services I provide" />
              </div>
            )}

            {/* Professional */}
            {form.type === 'professional' && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: '#B0A898' }}>Service Type *</div>
                {PROFESSIONAL_SUB_TYPES.map(sub => (
                  <button key={sub.value} type="button"
                    onClick={() => { set('professional_sub_type', sub.value); set('services_offered', []) }}
                    className="w-full flex items-start gap-3 p-4 rounded-2xl text-left transition-all"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${form.professional_sub_type === sub.value ? '#A855F7' : '#EEE9E0'}`,
                      boxShadow: form.professional_sub_type === sub.value ? '0 2px 16px rgba(168,85,247,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: '#0D1520' }}>{sub.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>{sub.desc}</div>
                    </div>
                    {form.professional_sub_type === sub.value && <CheckCircle size={16} style={{ color: '#A855F7', flexShrink: 0 }} />}
                  </button>
                ))}

                {subTypeConfig && (
                  <div className="rounded-2xl p-4 space-y-4"
                    style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div>
                      <label style={labelStyle}>{subTypeConfig.licenceLabel}</label>
                      <input style={inputStyle} value={form.licence_number} onChange={e => set('licence_number', e.target.value)} placeholder="Registration or licence number" />
                      {subTypeConfig.licenceHint && (
                        <a href={subTypeConfig.licenceHintUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] mt-1 inline-block" style={{ color: '#C9A84C' }}>
                          {subTypeConfig.licenceHint} ↗
                        </a>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Business / Practice Name</label>
                      <input style={inputStyle} value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="e.g. Prairie Immigration Services" />
                    </div>
                    <div>
                      <label style={labelStyle}>Services Offered</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {getServicesForSubType(form.professional_sub_type).map(s => (
                          <Chip key={s} label={s} active={form.services_offered.includes(s)} onClick={() => toggleItem('services_offered', s)} color="#A855F7" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Languages Spoken</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {LANGUAGES.map(l => (
                          <Chip key={l} label={l} active={form.languages_spoken.includes(l)} onClick={() => toggleItem('languages_spoken', l)} color="#A855F7" />
                        ))}
                      </div>
                    </div>
                    {form.professional_sub_type === 'immigration_consultant' && (
                      <>
                        <div>
                          <label style={labelStyle}>Worker Origin Countries</label>
                          <p className="text-xs mb-2" style={{ color: '#B0A898' }}>Countries you have experience processing workers from</p>
                          <div className="flex flex-wrap gap-2">
                            {WORKER_ORIGIN_COUNTRIES.map(c => (
                              <Chip key={c} label={c} active={form.worker_origin_countries.includes(c)} onClick={() => toggleItem('worker_origin_countries', c)} color="#A855F7" />
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Countries Served</label>
                          <div className="flex gap-2">
                            {['Canada','USA','Both'].map(c => {
                              const active = c === 'Both'
                                ? (form.countries_served.includes('Canada') && form.countries_served.includes('USA'))
                                : (form.countries_served.includes(c) && form.countries_served.length === 1)
                              return (
                                <button key={c} type="button"
                                  onClick={() => set('countries_served', c === 'Both' ? ['Canada','USA'] : [c])}
                                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                                  style={{ border: `1px solid ${active ? '#A855F7' : '#EEE9E0'}`, backgroundColor: active ? 'rgba(168,85,247,0.08)' : '#FFFFFF', color: active ? '#A855F7' : '#8A9BB0' }}>
                                  {c}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                    <CheckRow checked={form.remote_service} onChange={v => set('remote_service', v)}
                      label="Available for Remote / Virtual Consultations"
                      sublabel="Clients can work with you from anywhere" color="#A855F7" />
                    <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                      style={{ backgroundColor: '#F7F5F0', color: '#8A9BB0' }}>
                      <Scale size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>Connect360 is a directory only. You are responsible for all professional advice and services provided.</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Step 3 — Location & Availability ── */}
        {step === 3 && (
          <>
            <div className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B0A898' }}>Location</div>
              <div>
                <label style={labelStyle}>Base Country *</label>
                <select style={inputStyle} value={form.base_country} onChange={e => set('base_country', e.target.value)}>
                  {['Canada','USA','Australia','New Zealand','UK','Germany','France','Ireland','Wales','Scotland','Colombia','Brazil','South Africa','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {form.base_country === 'Other' && (
                  <input style={{ ...inputStyle, marginTop: 8 }} value={form.base_country_other} onChange={e => set('base_country_other', e.target.value)} placeholder="Specify your country" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Base City / Town *</label>
                  <input style={inputStyle} value={form.base_city} onChange={e => set('base_city', e.target.value)} placeholder="Swift Current" />
                </div>
                <div>
                  <label style={labelStyle}>{['Canada','USA'].includes(form.base_country) ? 'Province / State *' : 'Region'}</label>
                  {['Canada','USA'].includes(form.base_country) ? (
                    <select style={inputStyle} value={form.base_province} onChange={e => set('base_province', e.target.value)}>
                      <option value="">Select...</option>
                      <optgroup label="Canada">{CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}</optgroup>
                      <optgroup label="USA">{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</optgroup>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input style={inputStyle} value={form.province_other} onChange={e => set('province_other', e.target.value)} placeholder="Region (optional)" />
                  )}
                </div>
              </div>
            </div>

            {/* Professional provinces served */}
            {form.type === 'professional' && (
              <div className="rounded-2xl p-4 space-y-2"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Provinces / States Served</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PROVINCES_OPTIONS.map(p => (
                    <Chip key={p} label={p} active={form.provinces_served.includes(p)} onClick={() => toggleItem('provinces_served', p)} color="#A855F7" />
                  ))}
                </div>
              </div>
            )}

            {/* Service radius */}
            {!(form.type === 'professional' && form.remote_service) && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center justify-between">
                  <label style={{ ...labelStyle, marginBottom: 0 }}>
                    Service Radius — <span style={{ color: '#0D1520' }}>{form.worldwide ? 'Worldwide' : `${form.service_radius_km} km`}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.worldwide} onChange={e => set('worldwide', e.target.checked)} />
                    <span className="text-xs" style={{ color: '#8A9BB0' }}>Worldwide</span>
                  </label>
                </div>
                {!form.worldwide && (
                  <>
                    <input type="range" min={50} max={2000} step={50}
                      value={form.service_radius_km}
                      onChange={e => set('service_radius_km', Number(e.target.value))}
                      className="w-full" style={{ accentColor: '#C9A84C' }} />
                    <div className="flex justify-between text-[10px]" style={{ color: '#B0A898' }}>
                      <span>50 km</span><span>500 km</span><span>1,000 km</span><span>2,000 km</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Work countries — non-farmers only */}
            {form.type !== 'farmer' && (
              <div className="rounded-2xl p-4 space-y-2"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Countries I'm willing to work in</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_COUNTRY_OPTIONS.map(c => (
                    <Chip key={c} label={c} active={form.work_countries.includes(c)} onClick={() => toggleItem('work_countries', c)} />
                  ))}
                </div>
              </div>
            )}
            {/* Open to relocation — non-farmer, non-professional only */}
            {form.type !== 'professional' && form.type !== 'farmer' && (
              <CheckRow checked={form.open_to_relocation} onChange={v => set('open_to_relocation', v)}
                label="Open to Relocation" sublabel="I'm willing to relocate for the right opportunity" />
            )}
            {/* Sponsorship Offered — farmer only */}
            {form.type === 'farmer' && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Sponsorship Offered <span style={{ color: '#B0A898', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {['H-2A Visa', 'LMIA', 'TFW Program', 'Work Permit', 'Work Visa'].map(s => (
                    <button key={s} type="button" onClick={() => toggleItem('sponsorship_offered', s)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        border: `1px solid ${form.sponsorship_offered.includes(s) ? '#C9A84C' : '#EEE9E0'}`,
                        backgroundColor: form.sponsorship_offered.includes(s) ? '#FDF8EE' : '#FFFFFF',
                        color: form.sponsorship_offered.includes(s) ? '#C9A84C' : '#8A9BB0',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Availability */}
            <div className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <label style={labelStyle}>
                {form.type === 'farmer' ? 'Accepting Applications' : 'Current Availability'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {form.type === 'farmer' ? (
                  <>
                    {[
                      { value: 'immediate', label: 'Open', dot: '#22C55E' },
                      { value: 'unavailable', label: 'Closed', dot: '#D1D5DB' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('availability', opt.value)}
                        className="flex items-center gap-2 p-3 rounded-xl text-sm text-left transition-all"
                        style={{
                          border: `1px solid ${form.availability === opt.value ? '#C9A84C' : '#EEE9E0'}`,
                          backgroundColor: form.availability === opt.value ? '#FDF8EE' : '#FFFFFF',
                        }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.dot }} />
                        <span style={{ color: form.availability === opt.value ? '#0D1520' : '#8A9BB0', fontWeight: form.availability === opt.value ? 600 : 400 }}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { value: 'immediate', label: 'Available Now', dot: '#22C55E' },
                      { value: 'seasonal',  label: 'Seasonal',      dot: '#F59E0B' },
                      { value: 'contract',  label: 'Contract Only', dot: '#60A5FA' },
                      { value: 'unavailable', label: 'Unavailable', dot: '#D1D5DB' },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('availability', opt.value)}
                        className="flex items-center gap-2 p-3 rounded-xl text-sm text-left transition-all"
                        style={{
                          border: `1px solid ${form.availability === opt.value ? '#C9A84C' : '#EEE9E0'}`,
                          backgroundColor: form.availability === opt.value ? '#FDF8EE' : '#FFFFFF',
                        }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.dot }} />
                        <span style={{ color: form.availability === opt.value ? '#0D1520' : '#8A9BB0', fontWeight: form.availability === opt.value ? 600 : 400 }}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
              {(form.availability === 'seasonal' || form.availability === 'contract') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>From</label>
                    <input style={inputStyle} type="date" value={form.available_from} onChange={e => set('available_from', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>To</label>
                    <input style={inputStyle} type="date" value={form.available_to} onChange={e => set('available_to', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 4 — Experience & Details ── */}
        {step === 4 && (
          <>
            <div className="rounded-2xl p-4 space-y-4"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {form.type === 'farmer' ? (
                <div>
                  <label style={labelStyle}>Website / Social <span style={{ fontWeight: 400, color: '#B0A898' }}>(optional)</span></label>
                  <input style={inputStyle} type="url"
                    value={form.website_url}
                    onChange={e => set('website_url', e.target.value)}
                    placeholder="e.g. murphyfarms.ca or instagram.com/murphyfarms" />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Years of Experience</label>
                  <input style={inputStyle} type="number" min={0} max={60}
                    value={form.years_experience}
                    onChange={e => set('years_experience', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 12" />
                </div>
              )}
              <div>
                <label style={labelStyle}>{form.type === 'professional' ? 'Professional Bio *' : 'Bio / About You *'}</label>
                <textarea
                  rows={5}
                  style={{ ...inputStyle, resize: 'none' }}
                  value={form.bio}
                  onChange={e => set('bio', e.target.value)}
                  placeholder={form.type === 'professional'
                    ? 'Describe your practice, areas of expertise, and how you help agricultural clients.'
                    : form.type === 'farmer'
                    ? 'Describe your operation — what you grow, the type of help you need, and what makes your farm a great place to work. This is what providers see first — make it count.'
                    : 'Describe your experience, what you offer, and what makes you a great hire. This is what farmers see first — make it count.'} />
                {!form.bio.trim() && (
                  <p className="text-xs mt-1" style={{ color: '#B0A898' }}>Required before submitting.</p>
                )}
              </div>
            </div>

            {/* Worker sponsorship */}
            {form.type === 'worker' && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Work Authorization</label>
                <CheckRow checked={form.seeking_tfw_sponsorship} onChange={v => set('seeking_tfw_sponsorship', v)}
                  label="Seeking TFW Sponsorship (Canada)"
                  sublabel="I require LMIA / Temporary Foreign Worker Program sponsorship to work in Canada"
                  color="#60A5FA" />
                <CheckRow checked={form.seeking_h2a_sponsorship} onChange={v => set('seeking_h2a_sponsorship', v)}
                  label="Seeking H-2A Sponsorship (USA)"
                  sublabel="I require H-2A agricultural guest worker visa sponsorship to work in the United States"
                  color="#60A5FA" />
                {(form.seeking_tfw_sponsorship || form.seeking_h2a_sponsorship) && (
                  <div>
                    <label style={labelStyle}>Country of Citizenship</label>
                    <input style={inputStyle} value={form.citizenship_country} onChange={e => set('citizenship_country', e.target.value)} placeholder="e.g. Philippines, Mexico, Ukraine" />
                  </div>
                )}
              </div>
            )}

            {/* Commercial licence */}
            {form.type !== 'professional' && form.type !== 'farmer' && (
              <div className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Do you hold a commercial vehicle licence?</label>
                <div className="flex gap-2">
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                    <button key={String(opt.val)} type="button" onClick={() => set('holds_licence', opt.val)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        border: `1px solid ${form.holds_licence === opt.val ? '#C9A84C' : '#EEE9E0'}`,
                        backgroundColor: form.holds_licence === opt.val ? '#FDF8EE' : '#FFFFFF',
                        color: form.holds_licence === opt.val ? '#C9A84C' : '#8A9BB0',
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.holds_licence && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={labelStyle}>Licence Type</label>
                      <select style={inputStyle} value={form.driver_licence_type} onChange={e => set('driver_licence_type', e.target.value)}>
                        <option value="">Select type...</option>
                        <option value="Class 1A">Class 1A (SK/AB/MB — Semi)</option>
                        <option value="Class 1">Class 1 (BC/ON — Semi)</option>
                        <option value="CDL-A">CDL-A (USA — Semi)</option>
                        <option value="CDL-B">CDL-B (USA — Straight Truck)</option>
                        <option value="HGV Class 1">HGV Class 1 (UK/EU)</option>
                        <option value="HGV Class 2">HGV Class 2 (UK/EU)</option>
                        <option value="Class 3">Class 3 (Straight Truck)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Issuing Province / State</label>
                      <input style={inputStyle} value={form.driver_licence_province} onChange={e => set('driver_licence_province', e.target.value)} placeholder="e.g. SK, ND" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Equipment owned */}
            {(form.type === 'trucker' || form.type === 'applicator') && (
              <div className="rounded-2xl p-4"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>Equipment Owned</label>
                <input style={inputStyle} value={form.equipment_owned} onChange={e => set('equipment_owned', e.target.value)} placeholder="e.g. 2x B-train, 2023 Peterbilt 389, 140' Hagie sprayer" />
              </div>
            )}

            {/* Crops / Looking For + Operations + Brands */}
            {form.type !== 'professional' && (
              <>
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <label style={labelStyle}>{form.type === 'farmer' ? 'Looking For' : 'Crops Experienced With'}</label>
                  <div className="flex flex-wrap gap-2">
                    {(form.type === 'farmer'
                      ? ['Operators', 'General Labour', 'Truck Drivers', 'Office Staff', 'Professional Services', 'Custom Work', 'Contractors']
                      : CROP_OPTIONS
                    ).map(c => (
                      <Chip key={c} label={c} active={form.crops_experienced.includes(c)} onClick={() => toggleItem('crops_experienced', c)} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <label style={labelStyle}>Operations</label>
                  <div className="flex flex-wrap gap-2">
                    {[...OPERATIONS_OPTIONS, 'Other'].map(o => (
                      <Chip key={o} label={o} active={form.operations_experience.includes(o)} onClick={() => toggleItem('operations_experience', o)} />
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl p-4 space-y-2"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <label style={labelStyle}>Equipment & Brand Experience</label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_BRAND_OPTIONS.map(b => (
                      <Chip key={b} label={b} active={form.equipment_brands.includes(b)} onClick={() => toggleItem('equipment_brands', b)} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* CV Upload — workers only */}
            {form.type === 'worker' && (
              <div className="rounded-2xl p-4"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <label style={labelStyle}>CV / Résumé <span style={{ color: '#B0A898', textTransform: 'none', letterSpacing: 0 }}>(Optional — PDF, DOC, DOCX, max 5MB)</span></label>
                {cvFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl"
                    style={{ border: '1px solid #C9A84C40', backgroundColor: '#FDF8EE' }}>
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} style={{ color: '#C9A84C' }} />
                      <span className="text-sm truncate max-w-[180px]" style={{ color: '#0D1520' }}>{cvFile.name}</span>
                      <span className="text-xs" style={{ color: '#8A9BB0' }}>({(cvFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button type="button" onClick={() => setCvFile(null)} className="text-xs" style={{ color: '#EF4444' }}>Remove</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 p-4 rounded-xl border-dashed cursor-pointer transition-all"
                    style={{ border: '1.5px dashed #EEE9E0', backgroundColor: '#FAFAF8' }}>
                    <Upload size={16} style={{ color: '#B0A898' }} />
                    <span className="text-sm" style={{ color: '#B0A898' }}>Click to upload your CV</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => setCvFile(e.target.files?.[0] ?? null)} />
                  </label>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-2xl text-sm" style={{ backgroundColor: '#FFF0F0', color: '#EF4444', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer CTA — fixed */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pt-4"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
          backgroundColor: '#F7F5F0',
          borderTop: '1px solid #EEE9E0',
        }}>
        {step < 4 ? (
          <button
            onClick={() => canAdvance() && setStep(s => s + 1)}
            disabled={!canAdvance()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: canAdvance() ? '#0D1520' : '#E5E0D8',
              color: canAdvance() ? '#FFFFFF' : '#B0A898',
            }}>
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canAdvance()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              backgroundColor: (!submitting && canAdvance()) ? '#C9A84C' : '#E5E0D8',
              color: (!submitting && canAdvance()) ? '#FFFFFF' : '#B0A898',
            }}>
            {submitting ? <><RefreshCw size={16} className="animate-spin" /> Submitting...</> : <>Submit Profile <CheckCircle size={16} /></>}
          </button>
        )}
      </div>
    </div>
  )
}