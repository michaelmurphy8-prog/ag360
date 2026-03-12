'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Globe, Truck, Sprout, Users, Tractor, ChevronLeft,
  CheckCircle, Upload, AlertCircle, Briefcase, Scale
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type ProviderType = 'trucker' | 'applicator' | 'worker' | 'professional' | 'farmer'

interface FormData {
  type: ProviderType | ''
  // Personal
  first_name: string
  last_name: string
  email: string
  phone: string
  // Business
  business_name: string
  business_number: string
  insurance_confirmed: boolean
  licence_number: string
  licence_province: string
  // Location
  base_province: string
  base_city: string
  base_country: string
  base_country_other: string
  service_radius_km: number
  worldwide: boolean
  province_other: string
  open_to_relocation: boolean
  work_countries: string[]
  // Experience
  bio: string
  years_experience: number | ''
  equipment_owned: string
  crops_experienced: string[]
  operations_experience: string[]
  equipment_brands: string[]
  holds_licence: boolean
  driver_licence_type: string
  driver_licence_province: string
  availability: string
  available_from?: string
  available_to?: string
  // Professional services
  professional_sub_type: string
  // Farmer specific
  farmer_sub_types: string[]
  sponsorship_offered: string[]
  website_url: string
  languages_spoken: string[]
  services_offered: string[]
  provinces_served: string[]
  countries_served: string[]
  remote_service: boolean
  worker_origin_countries: string[]
  // Worker sponsorship
  seeking_tfw_sponsorship: boolean
  seeking_h2a_sponsorship: boolean
  citizenship_country: string
}

// ─── Constants ────────────────────────────────────────────────
const TRANSPORT_SERVICES = ['Grain & Fertilizer Hauling','Oversize & Heavy Haul','Custom Transport','Dry Bulk Loads','Liquid Tankers','Gravel & Sand','AC & Reefer Loads']
const CUSTOM_WORK_SERVICES = ['Crop Spraying','Fertilizer Application','Custom Harvest','Custom Seeding','Drone & Aerial Spraying Services']
const FARMER_SUB_TYPES = ['Grain','Produce','Cattle','Specialty','Horticulture','Aquaculture','Dairy','Viticulture','Citrus & Fruit']
const TYPE_OPTIONS = [
  {
    value: 'farmer',
    label: 'Farmer',
    icon: Tractor,
    desc: 'Grain, cattle, produce, dairy, specialty & more',
    color: 'text-green-400',
    border: 'border-green-400/40',
    bg: 'bg-green-400/10',
    glow: true,
    services: [],
  },
  {
    value: 'worker',
    label: 'Full Time & Seasonal Worker',
    icon: Users,
    desc: 'Harvest labour, seeding crews, general farm work',
    color: 'text-amber-400',
    border: 'border-amber-400/40',
    bg: 'bg-amber-400/10',
    services: [],
  },
  {
    value: 'trucker',
    label: 'Custom Transport',
    icon: Truck,
    desc: 'Grain & fertilizer hauling, oversize, bulk, tanker, reefer',
    color: 'text-blue-400',
    border: 'border-blue-400/40',
    bg: 'bg-blue-400/10',
    services: TRANSPORT_SERVICES,
  },
  {
    value: 'applicator',
    label: 'Custom Work',
    icon: Sprout,
    desc: 'Crop spraying, fertilizer, custom harvest, seeding, drones',
    color: 'text-green-400',
    border: 'border-green-400/40',
    bg: 'bg-green-400/10',
    services: CUSTOM_WORK_SERVICES,
  },
  {
    value: 'professional',
    label: 'Professional Services',
    icon: Briefcase,
    desc: 'Agronomy, immigration, accounting, legal, trades & more',
    color: 'text-purple-400',
    border: 'border-purple-400/40',
    bg: 'bg-purple-400/10',
    services: [],
  },
]

const PROFESSIONAL_SUB_TYPES = [
  {
    value: 'immigration_consultant',
    label: 'Immigration Consultant (RCIC)',
    desc: 'RCIC (Canada TFW / LMIA / PNP) or H-2A Attorney (USA)',
    licenceLabel: 'RCIC Licence # or Bar Association #',
    licenceHint: 'RCIC numbers are verifiable at college-ic.ca',
    licenceHintUrl: 'https://college-ic.ca/protecting-the-public/find-an-immigration-consultant',
  },
  {
    value: 'ag_accountant',
    label: 'Ag Accountant / Tax Advisor',
    desc: 'Farm tax, AgriStability, CCA, succession planning',
    licenceLabel: 'CPA Registration #',
    licenceHint: 'CPA numbers are verifiable at your provincial CPA body',
    licenceHintUrl: 'https://www.cpacanada.ca/en/members-area/find-a-cpa',
  },
  {
    value: 'crop_consultant',
    label: 'Crop Consultant',
    desc: 'Independent scouting, fertility planning, precision ag',
    licenceLabel: 'P.Ag Registration # (if applicable)',
    licenceHint: 'P.Ag numbers are verifiable at agrology.ca',
    licenceHintUrl: 'https://www.agrology.ca',
  },
  {
    value: 'agrologist',
    label: 'Agrologist (P.Ag)',
    desc: 'Licensed agrologist — soil health, agronomy, research',
    licenceLabel: 'P.Ag Registration #',
    licenceHint: 'P.Ag numbers are verifiable at agrology.ca',
    licenceHintUrl: 'https://www.agrology.ca',
  },
  {
    value: 'recruitment_agency',
    label: 'Farm Recruitment Agency',
    desc: 'Placing seasonal workers, operators, and farm managers',
    licenceLabel: 'Business Licence # (if applicable)',
    licenceHint: 'Provincial business registry',
    licenceHintUrl: 'https://www.canada.ca/en/services/business.html',
  },
  {
    value: 'farm_lawyer',
    label: 'Agricultural Lawyer',
    desc: 'Land titles, succession, contracts, water rights',
    licenceLabel: 'Law Society Member #',
    licenceHint: 'Verifiable through your provincial Law Society',
    licenceHintUrl: 'https://flsc.ca/law-societies/',
  },
  {
    value: 'ag_insurance',
    label: 'Ag Insurance Broker',
    desc: 'Crop insurance, hail, equipment, liability coverage',
    licenceLabel: 'Insurance Broker Licence #',
    licenceHint: 'Verifiable through your provincial insurance regulator',
    licenceHintUrl: 'https://www.canada.ca/en/financial-consumer-agency.html',
  },
  {
    value: 'farm_lender',
    label: 'Farm Lender / Financial Advisor',
    desc: 'FCC financing, operating lines, equipment loans, grants',
    licenceLabel: 'Financial Advisor Licence # (if applicable)',
    licenceHint: 'Verifiable through FSRA or provincial regulator',
    licenceHintUrl: 'https://www.fsrao.ca',
  },
  {
    value: 'veterinarian',
    label: 'Veterinarian / Herd Health',
    desc: 'Livestock health, herd management, biosecurity planning',
    licenceLabel: 'Veterinary Licence #',
    licenceHint: 'Verifiable through your provincial Veterinary Association',
    licenceHintUrl: 'https://www.canadianveterinarians.net',
  },
  {
    value: 'environmental',
    label: 'Environmental Consultant',
    desc: 'Environmental assessments, soil sampling, compliance',
    licenceLabel: 'Professional Designation # (if applicable)',
    licenceHint: 'ECO Canada or provincial environmental registry',
    licenceHintUrl: 'https://eco.ca',
  },
  { value: 'hr_consultant', label: 'HR Consultant', desc: 'Farm HR, hiring, onboarding, compliance, team management', licenceLabel: 'Business Registration Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'fuel_oil', label: 'Fuel, Oil & Lubricants', desc: 'On-farm fuel delivery, bulk oil, lubricant supply', licenceLabel: 'Business Registration Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'construction', label: 'Construction', desc: 'Farm construction, site prep, concrete, earthworks', licenceLabel: 'Business / Contractor Registration', licenceHint: '', licenceHintUrl: '' },
  { value: 'hvac_plumbing', label: 'HVAC & Plumbing', desc: 'Heating, cooling, ventilation, plumbing for farm facilities', licenceLabel: 'Trade Licence Number', licenceHint: '', licenceHintUrl: '' },
  { value: 'mechanic', label: 'Mechanic & Technician', desc: 'Farm equipment repair, diagnostics, welding, mobile service', licenceLabel: 'Trade Certification / Red Seal', licenceHint: '', licenceHintUrl: '' },
  { value: 'buildings_storage', label: 'Buildings & Storage', desc: 'Bins, grain storage, farm buildings, steel structures', licenceLabel: 'Business / Contractor Registration', licenceHint: '', licenceHintUrl: '' },
]

const IMMIGRATION_SERVICES = [
  'LMIA', 'TFW Program', 'Provincial Nominee Program (PNP)',
  'Permanent Residence', 'Study Permit', 'Work Permit',
  'Family Sponsorship', 'H-2A (USA)', 'Refugee Claims', 'Appeals & Hearings',
]

const AG_ACCOUNTANT_SERVICES = [
  'Farm Tax Returns', 'AgriStability / AgriInvest', 'GST / HST Filing',
  'Payroll & Labour', 'Succession Planning', 'Corporate Structure',
  'Bookkeeping', 'Financial Statements', 'CCA & Depreciation', 'Grant Applications',
]

const CROP_CONSULTANT_SERVICES = [
  'Crop Scouting', 'Soil Sampling', 'Fertilizer Planning', 'Pest & Disease ID',
  'Variety Selection', 'Precision Agriculture', 'NDVI & Remote Sensing',
  'Yield Mapping', 'Field Risk Assessment', 'Organic Certification',
]

const LANGUAGES = [
  'English', 'French', 'Spanish', 'Tagalog', 'Ukrainian', 'Hindi',
  'Punjabi', 'Portuguese', 'German', 'Mandarin', 'Korean', 'Other',
]

const WORKER_ORIGIN_COUNTRIES = [
  'Philippines', 'Mexico', 'Guatemala', 'Honduras', 'El Salvador',
  'Jamaica', 'Trinidad & Tobago', 'Ukraine', 'Poland', 'Romania',
  'India', 'Nepal', 'Other',
]

const CROP_OPTIONS = [
  'Canola', 'Wheat (HRS)', 'Wheat (Durum)', 'Wheat (CPS)',
  'Barley', 'Oats', 'Peas', 'Lentils', 'Chickpeas',
  'Flax', 'Mustard', 'Soybeans', 'Corn', 'Other',
]

const OPERATIONS_OPTIONS = [
  'Seeding', 'Spraying / Chemical Application', 'Haying & Baling', 'Swathing',
  'Combine Harvesting', 'Grain Cart Operation', 'Land Rolling & Rock Picking',
  'Grain Hauling & Trucking', 'Trucker', 'Fabricating & Mechanical', 'Chemical Mixing / Water Tender',
  'Fencing', 'Irrigation', 'Livestock Handling', 'Silage & Forage',
  'General Yard & Field Work', 'Other',
]

const EQUIPMENT_BRAND_OPTIONS = [
  'John Deere', 'Case IH', 'New Holland', 'AGCO / Fendt', 'Claas', 'Versatile',
  'MacDon', 'Bourgault', 'Morris Industries', 'Horsch', 'Seed Hawk', 'Salford',
  'Buhler / Farm King', 'John Deere Operations Center', 'CNH AFS', 'Trimble',
  'AgLeader', 'Raven', 'Topcon', 'Precision Planting', 'Climate FieldView',
  'Bushel Farm', 'Granular', 'AG360', 'FarmLogs', 'DJI',
]

const CANADIAN_PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const WORK_COUNTRY_OPTIONS = ['Canada', 'USA', 'Australia', 'New Zealand', 'UK', 'Germany', 'France', 'Ireland', 'Colombia', 'Brazil', 'Other']
const ALL_PROVINCES_OPTIONS = [...CANADIAN_PROVINCES, ...US_STATES]

const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm text-ag-primary outline-none transition-all
  focus:border-[var(--ag-accent)] placeholder:text-ag-muted`
const inputStyle = { borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }

function getServicesForSubType(sub: string): string[] {
  const map: Record<string, string[]> = {
    immigration_consultant: IMMIGRATION_SERVICES,
    ag_accountant: AG_ACCOUNTANT_SERVICES,
    crop_consultant: CROP_CONSULTANT_SERVICES,
    agrologist: ['Soil Health','Nutrient Management','Crop Rotation','Environmental Compliance','Land Evaluation','Agronomic Reports'],
    recruitment_agency: ['Labour Sourcing','TFW Placement','Seasonal Hiring','Permanent Placement','Payroll Services','HR Consulting'],
    farm_lawyer: ['Land Purchase/Sale','Lease Agreements','Wills & Estates','Farm Succession','Water Rights','Litigation','Corporate Structure'],
    ag_insurance: ['Crop Insurance','Hail Insurance','AgriInsurance','Farm Property','Liability','Equipment','Business Interruption'],
    farm_lender: ['Operating Lines','Equipment Financing','Land Loans','FCC Programs','Refinancing','Investment Planning'],
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
    holds_licence: false, driver_licence_type: '', driver_licence_province: '',
    availability: 'immediate',
    available_from: '',
    available_to: '',
    // Professional
    professional_sub_type: '',
    farmer_sub_types: [],
    sponsorship_offered: [],
    website_url: '',
    languages_spoken: [],
    services_offered: [],
    provinces_served: [],
    countries_served: ['Canada'],
    remote_service: true,
    worker_origin_countries: [],
    // Worker sponsorship
    seeking_tfw_sponsorship: false,
    seeking_h2a_sponsorship: false,
    citizenship_country: '',
  })

  function set(key: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // REPLACE WITH:
  function toggleItem(key: 'crops_experienced' | 'operations_experience' | 'equipment_brands' | 'work_countries' | 'languages_spoken' | 'services_offered' | 'provinces_served' | 'countries_served' | 'worker_origin_countries' | 'farmer_sub_types' | 'sponsorship_offered', val: string) {
    const arr = form[key] as string[]
    set(key, arr.includes(val) ? arr.filter(c => c !== val) : [...arr, val])
  }

  function canAdvance() {
    if (step === 1) return !!form.type
    if (step === 2) {
      const base = !!(form.first_name && form.last_name && form.email)
      if (form.type === 'professional') return base && !!form.professional_sub_type
      return base
    }
    if (step === 3) return !!(form.base_city && (form.base_province || form.province_other || !['Canada', 'USA'].includes(form.base_country)))
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
            style={{ backgroundColor: 'rgba(212,175,55,0.15)' }}>
            <CheckCircle size={32} className="text-[var(--ag-accent)]" />
          </div>
          <h2 className="text-xl font-bold text-ag-primary">Profile Submitted</h2>
          <p className="text-sm text-ag-muted">
            Your profile is under review. AG360 manually verifies all providers
            before they appear in the directory. You'll be contacted at{' '}
            <span className="text-ag-primary font-medium">{form.email}</span> once approved.
          </p>
          {form.type === 'professional' && (
            <p className="text-xs text-ag-muted px-4 py-3 rounded-lg border"
              style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
              Professional profiles include a licence verification step. Please ensure your registration
              number is accurate to avoid delays.
            </p>
          )}
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

  const stepLabel = step === 1 ? 'Provider Type'
    : step === 2 ? 'Personal & Business Info'
    : step === 3 ? 'Location & Availability'
    : 'Experience & Details'

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
          <p className="text-xs text-ag-muted">Step {step} of 4 — {stepLabel}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex-1 h-1 rounded-full transition-all"
            style={{ backgroundColor: s <= step ? 'var(--ag-accent)' : 'var(--ag-border)' }} />
        ))}
      </div>

      {/* ── Step 1 — Type selection */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-ag-muted">What best describes the service you provide?</p>
          {TYPE_OPTIONS.map(opt => {
            const Icon = opt.icon
            const selected = form.type === opt.value
            return (
              <div key={opt.value} className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: selected ? undefined : opt.glow ? 'rgba(34,197,94,0.4)' : 'var(--ag-border)',
                  backgroundColor: selected ? undefined : 'var(--ag-bg-card)',
                  boxShadow: selected ? undefined : opt.glow ? '0 0 0 3px rgba(34,197,94,0.08), 0 2px 12px rgba(34,197,94,0.15)' : undefined,
                }}>
              <button
                onClick={() => set('type', opt.value)}
                className={`w-full flex items-center gap-4 p-4 text-left transition-all ${selected ? `${opt.border} ${opt.bg}` : ''}`}
                style={{ backgroundColor: 'transparent' }}
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
              {opt.services.length > 0 && selected && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  {opt.services.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border text-ag-muted"
                      style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Step 2 — Personal & Business Info */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Farmer sub-type picker */}
          {form.type === 'farmer' && (
            <div className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: 'var(--ag-bg-card)', border: '1px solid var(--ag-border)' }}>
              <label className="block text-xs text-ag-muted mb-1.5 uppercase tracking-widest font-semibold">Farm Type <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2">
                {FARMER_SUB_TYPES.map(s => (
                  <button key={s} type="button" onClick={() => toggleItem('farmer_sub_types', s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      border: `1px solid ${form.farmer_sub_types.includes(s) ? '#C9A84C' : 'var(--ag-border)'}`,
                      backgroundColor: form.farmer_sub_types.includes(s) ? '#FDF8EE' : 'transparent',
                      color: form.farmer_sub_types.includes(s) ? '#C9A84C' : 'var(--ag-text-muted)',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
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

          {/* Trucker / Applicator business fields */}
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
                  <label className="block text-xs text-ag-muted mb-1.5">Issuing Province / State</label>
                  <select className={inputClass} style={inputStyle}
                    value={form.licence_province} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('licence_province', e.target.value)}>
                    <option value="">Select...</option>
                    <optgroup label="Canadian Provinces &amp; Territories">
                      <option value="AB">AB — Alberta</option>
                      <option value="BC">BC — British Columbia</option>
                      <option value="MB">MB — Manitoba</option>
                      <option value="NB">NB — New Brunswick</option>
                      <option value="NL">NL — Newfoundland &amp; Labrador</option>
                      <option value="NS">NS — Nova Scotia</option>
                      <option value="NT">NT — Northwest Territories</option>
                      <option value="NU">NU — Nunavut</option>
                      <option value="ON">ON — Ontario</option>
                      <option value="PE">PE — Prince Edward Island</option>
                      <option value="QC">QC — Quebec</option>
                      <option value="SK">SK — Saskatchewan</option>
                      <option value="YT">YT — Yukon</option>
                    </optgroup>
                    <optgroup label="US States">
                      <option value="AL">AL — Alabama</option>
                      <option value="AK">AK — Alaska</option>
                      <option value="AZ">AZ — Arizona</option>
                      <option value="AR">AR — Arkansas</option>
                      <option value="CA">CA — California</option>
                      <option value="CO">CO — Colorado</option>
                      <option value="CT">CT — Connecticut</option>
                      <option value="DE">DE — Delaware</option>
                      <option value="FL">FL — Florida</option>
                      <option value="GA">GA — Georgia</option>
                      <option value="HI">HI — Hawaii</option>
                      <option value="ID">ID — Idaho</option>
                      <option value="IL">IL — Illinois</option>
                      <option value="IN">IN — Indiana</option>
                      <option value="IA">IA — Iowa</option>
                      <option value="KS">KS — Kansas</option>
                      <option value="KY">KY — Kentucky</option>
                      <option value="LA">LA — Louisiana</option>
                      <option value="ME">ME — Maine</option>
                      <option value="MD">MD — Maryland</option>
                      <option value="MA">MA — Massachusetts</option>
                      <option value="MI">MI — Michigan</option>
                      <option value="MN">MN — Minnesota</option>
                      <option value="MS">MS — Mississippi</option>
                      <option value="MO">MO — Missouri</option>
                      <option value="MT">MT — Montana</option>
                      <option value="NE">NE — Nebraska</option>
                      <option value="NV">NV — Nevada</option>
                      <option value="NH">NH — New Hampshire</option>
                      <option value="NJ">NJ — New Jersey</option>
                      <option value="NM">NM — New Mexico</option>
                      <option value="NY">NY — New York</option>
                      <option value="NC">NC — North Carolina</option>
                      <option value="ND">ND — North Dakota</option>
                      <option value="OH">OH — Ohio</option>
                      <option value="OK">OK — Oklahoma</option>
                      <option value="OR">OR — Oregon</option>
                      <option value="PA">PA — Pennsylvania</option>
                      <option value="RI">RI — Rhode Island</option>
                      <option value="SC">SC — South Carolina</option>
                      <option value="SD">SD — South Dakota</option>
                      <option value="TN">TN — Tennessee</option>
                      <option value="TX">TX — Texas</option>
                      <option value="UT">UT — Utah</option>
                      <option value="VT">VT — Vermont</option>
                      <option value="VA">VA — Virginia</option>
                      <option value="WA">WA — Washington</option>
                      <option value="WV">WV — West Virginia</option>
                      <option value="WI">WI — Wisconsin</option>
                      <option value="WY">WY — Wyoming</option>
                    </optgroup>
                    <optgroup label="International">
                      <option value="UK">United Kingdom</option>
                      <option value="Europe">Europe</option>
                      <option value="AU">Australia</option>
                      <option value="NZ">New Zealand</option>
                      <option value="Other">Other</option>
                    </optgroup>
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

          {/* Professional Services fields */}
          {form.type === 'professional' && (
            <>
              {/* Sub-type selector */}
              <div>
                <label className="block text-xs text-ag-muted mb-2">Service Type *</label>
                <div className="space-y-2">
                  {PROFESSIONAL_SUB_TYPES.map(sub => (
                    <button key={sub.value} type="button"
                      onClick={() => { set('professional_sub_type', sub.value); set('services_offered', []) }}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
                      style={{
                        borderColor: form.professional_sub_type === sub.value ? 'rgba(168,85,247,0.5)' : 'var(--ag-border)',
                        backgroundColor: form.professional_sub_type === sub.value ? 'rgba(168,85,247,0.08)' : 'var(--ag-bg-card)',
                      }}>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-ag-primary">{sub.label}</div>
                        <div className="text-xs text-ag-muted mt-0.5">{sub.desc}</div>
                      </div>
                      {form.professional_sub_type === sub.value && (
                        <CheckCircle size={15} className="text-purple-400 mt-0.5 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Licence number — shown once sub-type is selected */}
              {subTypeConfig && (
                <>
                  <div>
                    <label className="block text-xs text-ag-muted mb-1.5">{subTypeConfig.licenceLabel}</label>
                    <input className={inputClass} style={inputStyle}
                      value={form.licence_number} onChange={e => set('licence_number', e.target.value)}
                      placeholder="Registration or licence number" />
                    <a href={subTypeConfig.licenceHintUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] mt-1 inline-block"
                      style={{ color: 'var(--ag-accent)' }}>
                      {subTypeConfig.licenceHint} ↗
                    </a>
                  </div>

                  {/* Business name */}
                  <div>
                    <label className="block text-xs text-ag-muted mb-1.5">Business / Practice Name</label>
                    <input className={inputClass} style={inputStyle}
                      value={form.business_name} onChange={e => set('business_name', e.target.value)}
                      placeholder="e.g. Prairie Immigration Services" />
                  </div>

                  {/* Services offered */}
                  <div>
                    <label className="block text-xs text-ag-muted mb-2">Services Offered</label>
                    <div className="flex flex-wrap gap-2">
                      {getServicesForSubType(form.professional_sub_type).map(s => (
                        <button key={s} type="button"
                          onClick={() => toggleItem('services_offered', s)}
                          className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                          style={{
                            borderColor: form.services_offered.includes(s) ? 'rgba(168,85,247,0.5)' : 'var(--ag-border)',
                            backgroundColor: form.services_offered.includes(s) ? 'rgba(168,85,247,0.08)' : 'var(--ag-bg-hover)',
                            color: form.services_offered.includes(s) ? '#c084fc' : 'var(--ag-text-secondary)',
                          }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="block text-xs text-ag-muted mb-2">Languages Spoken</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(l => (
                        <button key={l} type="button"
                          onClick={() => toggleItem('languages_spoken', l)}
                          className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                          style={{
                            borderColor: form.languages_spoken.includes(l) ? 'rgba(168,85,247,0.5)' : 'var(--ag-border)',
                            backgroundColor: form.languages_spoken.includes(l) ? 'rgba(168,85,247,0.08)' : 'var(--ag-bg-hover)',
                            color: form.languages_spoken.includes(l) ? '#c084fc' : 'var(--ag-text-secondary)',
                          }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Worker origin countries — immigration only */}
                  {form.professional_sub_type === 'immigration_consultant' && (
                    <>
                      <div>
                        <label className="block text-xs text-ag-muted mb-1">Worker Origin Countries</label>
                        <p className="text-[11px] text-ag-dim mb-2">Countries you have experience processing workers from</p>
                        <div className="flex flex-wrap gap-2">
                          {WORKER_ORIGIN_COUNTRIES.map(c => (
                            <button key={c} type="button"
                              onClick={() => toggleItem('worker_origin_countries', c)}
                              className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                              style={{
                                borderColor: form.worker_origin_countries.includes(c) ? 'rgba(168,85,247,0.5)' : 'var(--ag-border)',
                                backgroundColor: form.worker_origin_countries.includes(c) ? 'rgba(168,85,247,0.08)' : 'var(--ag-bg-hover)',
                                color: form.worker_origin_countries.includes(c) ? '#c084fc' : 'var(--ag-text-secondary)',
                              }}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-ag-muted mb-2">Countries Served</label>
                        <div className="flex gap-2">
                          {['Canada', 'USA', 'Both'].map(c => (
                            <button key={c} type="button"
                              onClick={() => set('countries_served', c === 'Both' ? ['Canada', 'USA'] : [c])}
                              className="flex-1 py-2 rounded-lg border text-xs font-medium transition-all"
                              style={{
                                borderColor: (c === 'Both' ? (form.countries_served.includes('Canada') && form.countries_served.includes('USA')) : form.countries_served.includes(c) && form.countries_served.length === 1) ? 'rgba(168,85,247,0.5)' : 'var(--ag-border)',
                                backgroundColor: (c === 'Both' ? (form.countries_served.includes('Canada') && form.countries_served.includes('USA')) : form.countries_served.includes(c) && form.countries_served.length === 1) ? 'rgba(168,85,247,0.08)' : 'var(--ag-bg-card)',
                                color: (c === 'Both' ? (form.countries_served.includes('Canada') && form.countries_served.includes('USA')) : form.countries_served.includes(c) && form.countries_served.length === 1) ? '#c084fc' : 'var(--ag-text-secondary)',
                              }}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Remote service */}
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
                    style={{ borderColor: form.remote_service ? 'rgba(168,85,247,0.4)' : 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
                    <input type="checkbox" checked={form.remote_service}
                      onChange={e => set('remote_service', e.target.checked)} />
                    <div>
                      <div className="text-sm text-ag-primary font-medium">Available for Remote / Virtual Consultations</div>
                      <div className="text-xs text-ag-muted">Clients can work with you from anywhere</div>
                    </div>
                  </label>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-2 p-3 rounded-lg border text-xs text-ag-muted"
                    style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                    <Scale size={13} className="flex-shrink-0 mt-0.5 text-ag-muted" />
                    <span>Connect360 is a directory and connection platform only. You are responsible for all professional advice and services provided. AG360 does not guarantee outcomes or verify credentials beyond the information you provide.</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step 3 — Location & Availability */}
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

          {/* Provinces served — professional */}
          {form.type === 'professional' && (
            <div>
              <label className="block text-xs text-ag-muted mb-1">Provinces / States Served</label>
              <p className="text-[11px] text-ag-dim mb-2">Select all you actively serve</p>
              <div className="flex flex-wrap gap-2">
                {ALL_PROVINCES_OPTIONS.map(p => (
                  <button key={p} type="button"
                    onClick={() => toggleItem('provinces_served', p)}
                    className="px-2.5 py-1 rounded-full border text-xs font-medium transition-all"
                    style={{
                      borderColor: form.provinces_served.includes(p) ? 'rgba(168,85,247,0.5)' : 'var(--ag-border)',
                      backgroundColor: form.provinces_served.includes(p) ? 'rgba(168,85,247,0.08)' : 'var(--ag-bg-hover)',
                      color: form.provinces_served.includes(p) ? '#c084fc' : 'var(--ag-text-secondary)',
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Service Radius — not shown for remote professionals */}
          {!(form.type === 'professional' && form.remote_service) && (
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
          )}

          {/* Work countries — non-farmers only */}
          {form.type !== 'farmer' && (
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
          )}

          {/* Open to relocation — non-farmer, non-professional only */}
          {form.type !== 'professional' && form.type !== 'farmer' && (
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
              style={{ borderColor: form.open_to_relocation ? 'var(--ag-accent-border)' : 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
              <input type="checkbox" checked={form.open_to_relocation}
                onChange={e => set('open_to_relocation', e.target.checked)} />
              <div>
                <div className="text-sm text-ag-primary font-medium">Open to Relocation</div>
                <div className="text-xs text-ag-muted">I'm willing to relocate for the right opportunity</div>
              </div>
            </label>
          )}

          {/* Sponsorship Offered — farmer only */}
          {form.type === 'farmer' && (
            <div>
              <label className="block text-xs text-ag-muted mb-2">Sponsorship Offered <span className="text-ag-dim">(optional)</span></label>
              <div className="flex flex-wrap gap-2">
                {['H-2A Visa', 'LMIA', 'TFW Program', 'Work Permit', 'Work Visa'].map(s => (
                  <button key={s} type="button"
                    onClick={() => toggleItem('sponsorship_offered', s)}
                    className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                    style={{
                      borderColor: form.sponsorship_offered.includes(s) ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                      backgroundColor: form.sponsorship_offered.includes(s) ? 'var(--ag-bg-active)' : 'var(--ag-bg-hover)',
                      color: form.sponsorship_offered.includes(s) ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          <div>
            <label className="block text-xs text-ag-muted mb-1.5">
              {form.type === 'farmer' ? 'Accepting Applications' : 'Current Availability'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(form.type === 'farmer' ? [
                { value: 'immediate', label: 'Open', color: 'text-green-400' },
                { value: 'unavailable', label: 'Closed', color: 'text-ag-muted' },
              ] : [
                { value: 'immediate', label: 'Available Now', color: 'text-green-400' },
                { value: 'seasonal', label: 'Seasonal', color: 'text-amber-400' },
                { value: 'contract', label: 'Contract Only', color: 'text-blue-400' },
                { value: 'unavailable', label: 'Unavailable', color: 'text-ag-muted' },
              ]).map(opt => (
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

          {/* Availability date range */}
          {(form.availability === 'seasonal' || form.availability === 'contract') && (
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">Availability Window <span className="text-ag-dim">(optional)</span></label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-ag-dim mb-1">From</label>
                  <input type="date" className={inputClass} style={inputStyle}
                    value={form.available_from ?? ''}
                    onChange={e => set('available_from', e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] text-ag-dim mb-1">To</label>
                  <input type="date" className={inputClass} style={inputStyle}
                    value={form.available_to ?? ''}
                    onChange={e => set('available_to', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── Step 4 — Experience & Details */}
      {step === 4 && (
        <div className="space-y-5">
          {form.type === 'farmer' ? (
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">Website / Social <span className="text-ag-dim font-normal">(optional)</span></label>
              <input className={inputClass} style={inputStyle} type="url"
                value={form.website_url}
                onChange={e => set('website_url', e.target.value)}
                placeholder="e.g. murphyfarms.ca or instagram.com/murphyfarms" />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-ag-muted mb-1.5">Years of Experience</label>
              <input className={inputClass} style={inputStyle} type="number" min={0} max={60}
                value={form.years_experience}
                onChange={e => set('years_experience', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 12" />
            </div>
          )}

          {/* Worker sponsorship — workers only */}
          {form.type === 'worker' && (
            <div className="space-y-3">
              <label className="block text-xs text-ag-muted">Work Authorization</label>

              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                style={{ borderColor: form.seeking_tfw_sponsorship ? 'rgba(56,189,248,0.4)' : 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
                <input type="checkbox" className="mt-0.5"
                  checked={form.seeking_tfw_sponsorship}
                  onChange={e => set('seeking_tfw_sponsorship', e.target.checked)} />
                <div>
                  <div className="text-sm text-ag-primary font-medium">Seeking TFW Sponsorship (Canada)</div>
                  <div className="text-xs text-ag-muted">I require LMIA / Temporary Foreign Worker Program sponsorship to work in Canada</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                style={{ borderColor: form.seeking_h2a_sponsorship ? 'rgba(56,189,248,0.4)' : 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
                <input type="checkbox" className="mt-0.5"
                  checked={form.seeking_h2a_sponsorship}
                  onChange={e => set('seeking_h2a_sponsorship', e.target.checked)} />
                <div>
                  <div className="text-sm text-ag-primary font-medium">Seeking H-2A Sponsorship (USA)</div>
                  <div className="text-xs text-ag-muted">I require H-2A agricultural guest worker visa sponsorship to work in the United States</div>
                </div>
              </label>

              {(form.seeking_tfw_sponsorship || form.seeking_h2a_sponsorship) && (
                <div>
                  <label className="block text-xs text-ag-muted mb-1.5">Country of Citizenship</label>
                  <input className={inputClass} style={inputStyle}
                    value={form.citizenship_country} onChange={e => set('citizenship_country', e.target.value)}
                    placeholder="e.g. Philippines, Mexico, Ukraine" />
                </div>
              )}
            </div>
          )}

          {/* Commercial Licence — non-professionals */}
          {form.type !== 'professional' && form.type !== 'farmer' && (
            <div>
              <label className="block text-xs text-ag-muted mb-2">Do you hold a commercial vehicle licence?</label>
              <div className="flex gap-2">
                {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => set('holds_licence', opt.val)}
                    className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all"
                    style={{
                      borderColor: form.holds_licence === opt.val ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                      backgroundColor: form.holds_licence === opt.val ? 'var(--ag-bg-active)' : 'var(--ag-bg-card)',
                      color: form.holds_licence === opt.val ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.holds_licence && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-ag-muted mb-1.5">Licence Type</label>
                    <select className={inputClass} style={inputStyle}
                      value={form.driver_licence_type} onChange={e => set('driver_licence_type', e.target.value)}>
                      <option value="">Select type...</option>
                      <option value="Class 1A">Class 1A (SK/AB/MB — Semi)</option>
                      <option value="Class 1">Class 1 (BC/ON — Semi)</option>
                      <option value="CDL-A">CDL-A (USA — Semi)</option>
                      <option value="CDL-B">CDL-B (USA — Straight Truck)</option>
                      <option value="HGV Class 1">HGV Class 1 (UK/EU — Articulated)</option>
                      <option value="HGV Class 2">HGV Class 2 (UK/EU — Rigid)</option>
                      <option value="Class 3">Class 3 (Straight Truck)</option>
                      <option value="Other">Other Equivalent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ag-muted mb-1.5">Issuing Province / State / Country</label>
                    <select className={inputClass} style={inputStyle}
                      value={form.driver_licence_province} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('driver_licence_province', e.target.value)}>
                        <option value="">Select...</option>
                        <optgroup label="Canadian Provinces &amp; Territories">
                          <option value="AB">AB — Alberta</option>
                          <option value="BC">BC — British Columbia</option>
                          <option value="MB">MB — Manitoba</option>
                          <option value="NB">NB — New Brunswick</option>
                          <option value="NL">NL — Newfoundland &amp; Labrador</option>
                          <option value="NS">NS — Nova Scotia</option>
                          <option value="NT">NT — Northwest Territories</option>
                          <option value="NU">NU — Nunavut</option>
                          <option value="ON">ON — Ontario</option>
                          <option value="PE">PE — Prince Edward Island</option>
                          <option value="QC">QC — Quebec</option>
                          <option value="SK">SK — Saskatchewan</option>
                          <option value="YT">YT — Yukon</option>
                        </optgroup>
                        <optgroup label="US States">
                          <option value="AL">AL — Alabama</option>
                          <option value="AK">AK — Alaska</option>
                          <option value="AZ">AZ — Arizona</option>
                          <option value="AR">AR — Arkansas</option>
                          <option value="CA">CA — California</option>
                          <option value="CO">CO — Colorado</option>
                          <option value="CT">CT — Connecticut</option>
                          <option value="DE">DE — Delaware</option>
                          <option value="FL">FL — Florida</option>
                          <option value="GA">GA — Georgia</option>
                          <option value="HI">HI — Hawaii</option>
                          <option value="ID">ID — Idaho</option>
                          <option value="IL">IL — Illinois</option>
                          <option value="IN">IN — Indiana</option>
                          <option value="IA">IA — Iowa</option>
                          <option value="KS">KS — Kansas</option>
                          <option value="KY">KY — Kentucky</option>
                          <option value="LA">LA — Louisiana</option>
                          <option value="ME">ME — Maine</option>
                          <option value="MD">MD — Maryland</option>
                          <option value="MA">MA — Massachusetts</option>
                          <option value="MI">MI — Michigan</option>
                          <option value="MN">MN — Minnesota</option>
                          <option value="MS">MS — Mississippi</option>
                          <option value="MO">MO — Missouri</option>
                          <option value="MT">MT — Montana</option>
                          <option value="NE">NE — Nebraska</option>
                          <option value="NV">NV — Nevada</option>
                          <option value="NH">NH — New Hampshire</option>
                          <option value="NJ">NJ — New Jersey</option>
                          <option value="NM">NM — New Mexico</option>
                          <option value="NY">NY — New York</option>
                          <option value="NC">NC — North Carolina</option>
                          <option value="ND">ND — North Dakota</option>
                          <option value="OH">OH — Ohio</option>
                          <option value="OK">OK — Oklahoma</option>
                          <option value="OR">OR — Oregon</option>
                          <option value="PA">PA — Pennsylvania</option>
                          <option value="RI">RI — Rhode Island</option>
                          <option value="SC">SC — South Carolina</option>
                          <option value="SD">SD — South Dakota</option>
                          <option value="TN">TN — Tennessee</option>
                          <option value="TX">TX — Texas</option>
                          <option value="UT">UT — Utah</option>
                          <option value="VT">VT — Vermont</option>
                          <option value="VA">VA — Virginia</option>
                          <option value="WA">WA — Washington</option>
                          <option value="WV">WV — West Virginia</option>
                          <option value="WI">WI — Wisconsin</option>
                          <option value="WY">WY — Wyoming</option>
                        </optgroup>
                        <optgroup label="International">
                          <option value="UK">United Kingdom</option>
                          <option value="Europe">Europe</option>
                          <option value="AU">Australia</option>
                          <option value="NZ">New Zealand</option>
                          <option value="Other">Other</option>
                        </optgroup>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-ag-muted mb-1.5">
              {form.type === 'professional' ? 'Professional Bio *' : 'Bio / About You *'}
            </label>
            <textarea className={inputClass} style={inputStyle} rows={4}
              value={form.bio} onChange={e => set('bio', e.target.value)}
              placeholder={form.type === 'professional'
                ? 'Describe your practice, areas of expertise, and how you help agricultural clients.'
                : 'Describe your experience, what you offer, and what makes you a great hire. This is what farmers see first — make it count.'} />
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

          {/* Crops + Operations + Brands — non-professionals */}
          {form.type !== 'professional' && (
            <>
              <div>
                <label className="block text-xs text-ag-muted mb-2">{form.type === 'farmer' ? 'Looking For' : 'Crops Experienced With'}</label>
                <div className="flex flex-wrap gap-2">
                  {(form.type === 'farmer'
                    ? ['Operators', 'General Labour', 'Truck Drivers', 'Office Staff', 'Professional Services', 'Custom Work', 'Contractors']
                    : CROP_OPTIONS
                  ).map(crop => (
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

              <div>
                <label className="block text-xs text-ag-muted mb-1">Operations</label>
                <p className="text-[11px] text-ag-dim mb-2">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {[...OPERATIONS_OPTIONS, 'Other'].map(op => (
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
            </>
          )}

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